import type { RunningFinishDTO } from "../dto/running/running-finish.dto.js";
import type { RunningHistoryResponseDTO } from "../dto/running/running-history.dto.js";
import type { RunningListQueryDTO } from "../dto/running/running-list-query.dto.js";
import type {
  RunningFinishResponseDTO,
  RunningPaceResponseDTO,
  RunningPaceSegmentDTO,
  RunningStartResponseDTO,
  RunningTrackpointsResponseDTO,
} from "../dto/running/running-response.dto.js";
import type { RunningStartDTO } from "../dto/running/running-start.dto.js";
import type { RunningTrackpointsDTO } from "../dto/running/running-trackpoint.dto.js";
import { logger } from "../logging/logger.js";
import { ApiError } from "../middleware/error.js";
import { findRouteRecommendationByIdx } from "../repositories/route-recommendations.repository.js";
import {
  createRunningSession,
  findInProgressSessionByUserIdx,
  findRunningSessionByIdxAndUserIdx,
  findRunningSessionsByUserIdx,
  updateRunningSessionResult,
} from "../repositories/running-sessions.repository.js";
import {
  calculateRunningTrackpointStats,
  createRunningTrackpoints,
  findProjectedTrackpointsBySessionIdx,
  type RunningTrackpointProjectedRow,
} from "../repositories/running-trackpoints.repository.js";

const SEGMENT_DISTANCE_M = 1000;

function calculateAveragePaceSecPerKm(
  startedAt: Date,
  finishedAt: Date,
  distanceM: number,
): number | null {
  if (distanceM <= 0) {
    return null;
  }

  const durationSec = Math.floor((finishedAt.getTime() - startedAt.getTime()) / 1000);

  if (durationSec <= 0) {
    return null;
  }

  return Math.round(durationSec / (distanceM / 1000));
}

/**
 * 빗변 구하기
 */
function calculateProjectedDistanceM(from: RunningTrackpointProjectedRow, to: RunningTrackpointProjectedRow): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/**
 * A지점과 B 지점 사이에 km 단위 구간이 존재한다면 해당 구간까지 간 시간(초)를 구하기 위해 비율대로 계산
 * 
 * 두 지점별 누적 거리의 차이에 
 */
function interpolateTimeMs(from: RunningTrackpointProjectedRow, to: RunningTrackpointProjectedRow, ratio: number): number {
  return from.recordedAt.getTime() + (to.recordedAt.getTime() - from.recordedAt.getTime()) * ratio;
}

function toPace(durationMs: number, distanceM: number): number {
  return Math.round((durationMs / 1000) / (distanceM / 1000));
}

// 페이스 구간별 속도 계산해주기
function calculatePaceSegments(trackpoints: RunningTrackpointProjectedRow[]): RunningPaceSegmentDTO[] {
  const segments: RunningPaceSegmentDTO[] = [];
  let totalDistance = 0;
  let segmentFromDistance = 0;
  let segmentFromTimeMs = trackpoints[0]?.recordedAt.getTime() ?? 0;

  // 인덱스부터 프랙포인트 개수만큼 계산해주기
  for (let index = 1; index < trackpoints.length; index += 1) {
    const prev = trackpoints[index - 1];
    const current = trackpoints[index];

    if (!prev || !current) {
      continue;
    }

    // 5179 기준으로 두 좌표 거리 구해주기
    const edgeDistance = calculateProjectedDistanceM(prev, current);

    if (edgeDistance <= 0) {
      continue;
    }
    
    // 지속적으로 trackpoint[i-1] -> trackpoint[i]로 계산하는 방식에서 두 구간 사이에 1000m 단위가 있는 것을 책정
    // trackpoint[i-1]을 담당할 변수
    const edgeStartDistance = totalDistance;
    // trackpoint[i]를 담당할 변수
    const edgeEndDistance = totalDistance + edgeDistance;
    
    // 이번 gps 선분 안에서 1km 경계를 넘었는지 확인. 넘지 않았다면 바로 패스
    // 넘었어도 if문으로 처리하지 않고 하나의 구간이 1000m일 수 있기 때문에 중간에 나누어서 계산해주기
    while (Math.floor(segmentFromDistance / SEGMENT_DISTANCE_M) < Math.floor(edgeEndDistance / SEGMENT_DISTANCE_M)) {
      // 다음 1000m 지점을 구해주는 코드
      // segmentFromDistance의 다음 1000m 지점을 구해줍니다.
      const boundaryDistance = (Math.floor(segmentFromDistance / SEGMENT_DISTANCE_M) + 1) * SEGMENT_DISTANCE_M;

      // 이번에 계산중인 선분의 길이에 대해 `1000m 구간` - `시작 구간` 거리를 구해서 비율로 나누어 내분점 비율을 구해주기
      const ratio = (boundaryDistance - edgeStartDistance) / edgeDistance;
      // 이후 해당 구간까지 가는데 얼마나 걸렸는지 prev.recordedAt와 current.recordedAt의 ratio 비율을 구해서 받아주기
      const boundaryTimeMs = interpolateTimeMs(prev, current, ratio);
      // 현재 페이스 구간 정의 (보통 1000(m))
      const segmentDistance = boundaryDistance - segmentFromDistance;

      // 시간과 거리가 정상적인 경우에 저장하여 응답으로 만들 수 있게 정리해줍니다.
      if (segmentDistance > 0 && boundaryTimeMs > segmentFromTimeMs) {
        segments.push({
          distanceFrom: Math.round(segmentFromDistance),
          distanceTo: Math.round(boundaryDistance),
          pace: toPace(boundaryTimeMs - segmentFromTimeMs, segmentDistance),
        });
      }
      
      // 다음 구간을 계산하기 위해 구간의 시작 지점을 갱신해줍니다.
      segmentFromDistance = boundaryDistance;
      segmentFromTimeMs = boundaryTimeMs;
    }

    // 총 거리에 마지막 노드를 넣어줍니다.
    totalDistance = edgeEndDistance;
  }

  const lastTrackpoint = trackpoints[trackpoints.length - 1];

  // 남은 거리와 시간이 있으면 계산해줍니다.
  if (lastTrackpoint && totalDistance > segmentFromDistance && lastTrackpoint.recordedAt.getTime() > segmentFromTimeMs) {
    const segmentDistance = totalDistance - segmentFromDistance;

    segments.push({
      distanceFrom: Math.round(segmentFromDistance),
      distanceTo: Math.round(totalDistance),
      pace: toPace(lastTrackpoint.recordedAt.getTime() - segmentFromTimeMs, segmentDistance),
    });
  }

  return segments;
}

/**
 * 현재 사용자의 러닝 기록 요약과 목록 항목을 반환합니다.
 */
export async function listRunningHistory(
  userIdx: number,
  query: RunningListQueryDTO,
): Promise<RunningHistoryResponseDTO> {
  logger.info({ serviceName: "running", action: "listRunningHistory", userIdx, page: query.page, limit: query.limit }, "service:start");

  // 요청 유효성 검사
  if (query.from && query.to && query.from > query.to) {
    logger.warn({ serviceName: "running", action: "listRunningHistory", userIdx }, "service:invalid_period");

    throw new ApiError({
      status: 400,
      code: "INVALID_RUNNING_HISTORY_PERIOD",
      message: "러닝 기록 조회 시작일은 종료일보다 늦을 수 없습니다.",
    });
  }

  // 쿼리 실행 
  // [idx, users_idx, route_recommendations_idx, status, started_at, finished_at, distance, average_pace]
  // 가져오기
  const sessions = await findRunningSessionsByUserIdx(userIdx, query);

  logger.info({
    serviceName: "running",
    action: "listRunningHistory",
    userIdx,
    itemCount: sessions.length,
  }, "service:success");

  return {
    items: sessions.map((session) => ({
      idx: session.idx,
      status: session.status === "IN_PROGRESS" ? "FAILED" : session.status,
      startedAt: session.startedAt.toISOString(),
      finishedAt: session.finishedAt?.toISOString() ?? null,
      distance: session.distance,
      averagePace: session.averagePace,
    })),
    page: query.page,
    limit: query.limit,
  };
}

/**
 * 추천 코스를 기준으로 새 러닝 세션을 시작합니다.
 */
export async function startRunningSession(
  userIdx: number,
  dto: RunningStartDTO,
): Promise<RunningStartResponseDTO> {
  logger.info({
    serviceName: "running",
    action: "startRunningSession",
    userIdx,
    routeRecommendationIdx: dto.routeRecommendationIdx,
  }, "service:start");

  // routeRecommendationIdx가 실제 추천 코스인지 확인합니다.
  const recommendation = await findRouteRecommendationByIdx(dto.routeRecommendationIdx);

  if (!recommendation) {
    logger.warn({
      serviceName: "running",
      action: "startRunningSession",
      userIdx,
      routeRecommendationIdx: dto.routeRecommendationIdx,
    }, "service:route_recommendation_not_found");

    throw new ApiError({
      status: 404,
      code: "ROUTE_RECOMMENDATION_NOT_FOUND",
      message: "선택한 추천 코스를 찾을 수 없습니다.",
    });
  }

  // 한 사용자는 동시에 하나의 진행 중 세션만 가질 수 있게 막습니다.
  const inProgressSession = await findInProgressSessionByUserIdx(userIdx);

  if (inProgressSession) {
    logger.warn({
      serviceName: "running",
      action: "startRunningSession",
      userIdx,
      sessionIdx: inProgressSession.idx,
    }, "service:session_already_in_progress");

    throw new ApiError({
      status: 409,
      code: "RUNNING_SESSION_ALREADY_IN_PROGRESS",
      message: "이미 진행 중인 러닝 세션이 있습니다.",
      details: {
        sessionIdx: inProgressSession.idx,
      },
    });
  }

  const session = await createRunningSession({
    userIdx,
    routeRecommendationIdx: dto.routeRecommendationIdx,
    startedAt: dto.startedAt,
  });

  logger.info({
    serviceName: "running",
    action: "startRunningSession",
    userIdx,
    sessionIdx: session.idx,
  }, "service:success");

  return {
    sessionIdx: session.idx,
    status: "IN_PROGRESS",
  };
}

/**
 * 러닝 세션에 전달된 GPS 트랙포인트를 저장합니다.
 */
export async function saveRunningTrackpoints(
  userIdx: number,
  sessionIdx: number,
  dto: RunningTrackpointsDTO,
): Promise<RunningTrackpointsResponseDTO> {
  logger.info({
    serviceName: "running",
    action: "saveRunningTrackpoints",
    userIdx,
    sessionIdx,
    requestedCount: dto.trackpoints.length,
  }, "service:start");

  // 세션 소유자와 현재 진행 상태를 확인합니다.
  const session = await findRunningSessionByIdxAndUserIdx(sessionIdx, userIdx);

  if (!session) {
    logger.warn({ serviceName: "running", action: "saveRunningTrackpoints", userIdx, sessionIdx }, "service:session_not_found");

    throw new ApiError({
      status: 404,
      code: "RUNNING_SESSION_NOT_FOUND",
      message: "러닝 세션을 찾을 수 없습니다.",
    });
  }

  if (session.status !== "IN_PROGRESS") {
    logger.warn({
      serviceName: "running",
      action: "saveRunningTrackpoints",
      userIdx,
      sessionIdx,
      status: session.status,
    }, "service:session_not_in_progress");

    throw new ApiError({
      status: 409,
      code: "RUNNING_SESSION_NOT_IN_PROGRESS",
      message: "진행 중인 러닝 세션에만 트랙포인트를 저장할 수 있습니다.",
    });
  }

  // clientTrackpointId UNIQUE 제약으로 재전송 중복을 DB에서 무시합니다.
  const savedCount = await createRunningTrackpoints(sessionIdx, dto.trackpoints);

  logger.info({
    serviceName: "running",
    action: "saveRunningTrackpoints",
    userIdx,
    sessionIdx,
    requestedCount: dto.trackpoints.length,
    savedCount,
  }, "service:success");

  return {
    savedCount,
  };
}

/**
 * 러닝 세션을 종료하고 계산된 거리와 평균 페이스를 저장합니다.
 */
export async function finishRunningSession(
  userIdx: number,
  sessionIdx: number,
  dto: RunningFinishDTO,
): Promise<RunningFinishResponseDTO> {
  logger.info({ serviceName: "running", action: "finishRunningSession", userIdx, sessionIdx }, "service:start");

  // 세션 소유자와 종료 가능한 상태인지 확인합니다.
  const session = await findRunningSessionByIdxAndUserIdx(sessionIdx, userIdx);

  if (!session) {
    logger.warn({ serviceName: "running", action: "finishRunningSession", userIdx, sessionIdx }, "service:session_not_found");

    throw new ApiError({
      status: 404,
      code: "RUNNING_SESSION_NOT_FOUND",
      message: "러닝 세션을 찾을 수 없습니다.",
    });
  }

  if (session.status !== "IN_PROGRESS") {
    logger.warn({
      serviceName: "running",
      action: "finishRunningSession",
      userIdx,
      sessionIdx,
      status: session.status,
    }, "service:session_not_in_progress");

    throw new ApiError({
      status: 409,
      code: "RUNNING_SESSION_NOT_IN_PROGRESS",
      message: "진행 중인 러닝 세션만 종료할 수 있습니다.",
    });
  }

  const finishedAt = new Date(dto.finishedAt);

  if (finishedAt.getTime() <= session.startedAt.getTime()) {
    logger.warn({ serviceName: "running", action: "finishRunningSession", userIdx, sessionIdx }, "service:invalid_finish_time");

    throw new ApiError({
      status: 400,
      code: "INVALID_RUNNING_FINISH_TIME",
      message: "종료 시각은 시작 시각 이후여야 합니다.",
    });
  }

  // 거리 계산은 PostGIS에서 accuracy 50m 이하 또는 NULL 트랙포인트만 사용해 5179 기준으로 계산합니다.
  const trackpointStats = await calculateRunningTrackpointStats(sessionIdx);

  if (trackpointStats.trackpointCount < 2) {
    logger.warn({
      serviceName: "running",
      action: "finishRunningSession",
      userIdx,
      sessionIdx,
      trackpointCount: trackpointStats.trackpointCount,
    }, "service:not_enough_trackpoints");

    throw new ApiError({
      status: 409,
      code: "NOT_ENOUGH_RUNNING_TRACKPOINTS",
      message: "러닝 종료 계산에 필요한 유효 트랙포인트가 부족합니다.",
    });
  }

  const distance = trackpointStats.distance;
  const averagePace = calculateAveragePaceSecPerKm(session.startedAt, finishedAt, distance);

  if (distance <= 0 || averagePace === null) {
    logger.warn({
      serviceName: "running",
      action: "finishRunningSession",
      userIdx,
      sessionIdx,
      distance,
      averagePace,
    }, "service:invalid_distance");

    throw new ApiError({
      status: 409,
      code: "INVALID_RUNNING_DISTANCE",
      message: "러닝 거리와 평균 페이스를 계산할 수 없습니다.",
    });
  }

  const updatedSession = await updateRunningSessionResult({
    sessionIdx,
    status: "COMPLETED",
    finishedAt: dto.finishedAt,
    distance,
    averagePace,
  });

  if (!updatedSession) {
    logger.error({ serviceName: "running", action: "finishRunningSession", userIdx, sessionIdx }, "service:failed");

    throw new ApiError({
      status: 409,
      code: "RUNNING_SESSION_FINISH_FAILED",
      message: "러닝 세션 종료 처리에 실패했습니다.",
    });
  }

  logger.info({
    serviceName: "running",
    action: "finishRunningSession",
    userIdx,
    sessionIdx: updatedSession.idx,
    distance,
    averagePace,
  }, "service:success");

  return {
    sessionIdx: updatedSession.idx,
    status: "COMPLETED",
    distance,
    averagePace,
  };
}

/**
 * 러닝 세션의 1km 단위 페이스 분석 결과를 반환합니다.
 */
export async function getRunningPace(
  userIdx: number,
  sessionIdx: number,
): Promise<RunningPaceResponseDTO> {
  logger.info({ serviceName: "running", action: "getRunningPace", userIdx, sessionIdx }, "service:start");

  const session = await findRunningSessionByIdxAndUserIdx(sessionIdx, userIdx);

  if (!session) {
    logger.warn({ serviceName: "running", action: "getRunningPace", userIdx, sessionIdx }, "service:session_not_found");

    throw new ApiError({
      status: 404,
      code: "RUNNING_SESSION_NOT_FOUND",
      message: "러닝 세션을 찾을 수 없습니다.",
    });
  }

  // 정확도가 높은 위경도 좌표값들 불러오기
  const trackpoints = await findProjectedTrackpointsBySessionIdx(sessionIdx);

  if (trackpoints.length < 2) {
    logger.warn({
      serviceName: "running",
      action: "getRunningPace",
      userIdx,
      sessionIdx,
      trackpointCount: trackpoints.length,
    }, "service:not_enough_trackpoints");

    throw new ApiError({
      status: 409,
      code: "NOT_ENOUGH_RUNNING_TRACKPOINTS",
      message: "페이스 계산에 필요한 유효 트랙포인트가 부족합니다.",
    });
  }

  // km 구간별 계산하기
  // 최종적으로 시작 m, 종료 m, 걸린 시간을 1000m 단위로 뽑아줍니다.
  const segments = calculatePaceSegments(trackpoints);

  if (segments.length === 0) {
    logger.warn({ serviceName: "running", action: "getRunningPace", userIdx, sessionIdx }, "service:invalid_segments");

    throw new ApiError({
      status: 409,
      code: "INVALID_RUNNING_PACE_SEGMENTS",
      message: "페이스 구간을 계산할 수 없습니다.",
    });
  }

  logger.info({
    serviceName: "running",
    action: "getRunningPace",
    userIdx,
    sessionIdx,
    segmentCount: segments.length,
  }, "service:success");

  return {
    sessionIdx,
    averagePace: session.averagePace,
    segments,
  };
}
