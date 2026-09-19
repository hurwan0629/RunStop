import { createHash } from "node:crypto";
import { z } from "zod";
import { env } from "../config/env.js";
import { ApiError } from "../middleware/error.js";
import { logger } from "../logging/logger.js";
import { runningDetailSchema, runningEnvironmentSchema } from "../dto/running/running-detail.dto.js";
import {
  findRunningSessionByIdxAndUserIdx,
  findRunningTrackAnalysis,
  saveRunningTrackAnalysis,
} from "../repositories/running-sessions.repository.js";
import { findTrackpointsBySessionIdx } from "../repositories/running-trackpoints.repository.js";
import { findRouteDetailByIdx } from "../repositories/route-recommendations.repository.js";
import { buildRunningSegments } from "./running-segments.js";

const trackAnalysisSchema = z.object({
  fingerprint: z.string(),
  segments: z.array(runningEnvironmentSchema),
});

/** 사용자·관리자 모두 같은 실제 주행 분석을 사용하며, 먼저 세션 소유자를 검증한다. */
export async function getRunningDetail(userIdx: number, sessionIdx: number) {
  const session = await findRunningSessionByIdxAndUserIdx(sessionIdx, userIdx);
  if (!session) {
    throw new ApiError({ status: 404, code: "RUNNING_SESSION_NOT_FOUND", message: "러닝 기록을 찾을 수 없습니다." });
  }
  const [route, trackpoints] = await Promise.all([
    findRouteDetailByIdx(session.routeRecommendationIdx),
    findTrackpointsBySessionIdx(sessionIdx),
  ]);
  const track = buildRunningSegments(trackpoints);
  let analysisStatus = session.status === "IN_PROGRESS" ? "IN_PROGRESS" : "INSUFFICIENT";

  // 완료 기록만 분석·캐시한다. 뒤늦게 저장된 GPS가 있으면 해시가 달라져 다시 계산한다.
  if (track.segments.length && session.status !== "IN_PROGRESS") {
    analysisStatus = "UNAVAILABLE";
    const paths = track.segments.map(segment => segment.path);
    const fingerprint = createHash("sha256").update(JSON.stringify(paths)).digest("hex");
    try {
      const cached = trackAnalysisSchema.safeParse(await findRunningTrackAnalysis(sessionIdx));
      let environments: z.infer<typeof runningEnvironmentSchema>[];
      if (cached.success && cached.data.fingerprint === fingerprint && cached.data.segments.length === paths.length) {
        environments = cached.data.segments;
      } else {
        const response = await fetch(new URL("/routes/analyze-track", env.WORKER_URL), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments: paths }),
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`Track analysis status ${response.status}`);
        environments = z.array(runningEnvironmentSchema).parse(await response.json());
        if (environments.length !== paths.length) throw new Error("Track analysis count mismatch");
        await saveRunningTrackAnalysis(sessionIdx, { fingerprint, segments: environments });
      }
      track.segments.forEach((segment, index) => { segment.environment = environments[index]!; });
      analysisStatus = "AVAILABLE";
    } catch (error) {
      // 환경 분석 장애가 있어도 지도와 페이스 기록은 계속 제공한다.
      logger.warn({ err: error, sessionIdx }, "running:track_analysis_unavailable");
    }
  }

  return runningDetailSchema.parse({
    sessionIdx, userIdx, status: session.status,
    startedAt: session.startedAt.toISOString(),
    finishedAt: session.finishedAt?.toISOString() ?? null,
    distance: session.distance, averagePace: session.averagePace,
    route: route ? { ...route, path: route.path ?? [] } : null,
    ...track, analysisStatus,
  });
}
