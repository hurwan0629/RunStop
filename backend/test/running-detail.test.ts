import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { buildRunningSegments } from "../src/services/running-segments.js";
import type { RunningTrackpointRow } from "../src/repositories/running-trackpoints.repository.js";

vi.mock("../src/config/env.js", () => ({
  env: { WORKER_URL: "http://worker.test", NODE_ENV: "test", LOG_LEVEL: "silent" },
}));
vi.mock("../src/repositories/running-sessions.repository.js", () => ({
  findRunningSessionByIdxAndUserIdx: vi.fn(),
  findRunningTrackAnalysis: vi.fn(),
  saveRunningTrackAnalysis: vi.fn(),
}));
vi.mock("../src/repositories/running-trackpoints.repository.js", () => ({ findTrackpointsBySessionIdx: vi.fn() }));
vi.mock("../src/repositories/route-recommendations.repository.js", () => ({
  findRouteDetailByIdx: vi.fn(), findRouteRecommendationsByRequestIdx: vi.fn(),
}));
vi.mock("../src/repositories/route-requests.repository.js", () => ({ findRouteRequestByIdxAndUserIdx: vi.fn() }));
vi.mock("../src/repositories/admin-running.repository.js", () => ({
  findSessionOwner: vi.fn(), findAdminRuns: vi.fn(), findRunningAnalytics: vi.fn(),
}));

import * as sessions from "../src/repositories/running-sessions.repository.js";
import * as tracks from "../src/repositories/running-trackpoints.repository.js";
import * as routes from "../src/repositories/route-recommendations.repository.js";
import * as requests from "../src/repositories/route-requests.repository.js";
import * as admin from "../src/repositories/admin-running.repository.js";
import { getRunningDetail } from "../src/services/running-detail.service.js";
import { getAdminRunningDetail } from "../src/services/admin-running.service.js";
import { adminRunningQuerySchema } from "../src/controllers/admin-running.controller.js";

// 적도 위의 미터 좌표로 보간 결과를 독립적으로 검증한다.
function point(meters: number, seconds: number, accuracy: number | null = 5): RunningTrackpointRow {
  return {
    idx: seconds, clientTrackpointId: String(seconds), sessionIdx: 7,
    lat: 0, lng: meters / 6371000 * 180 / Math.PI,
    recordedAt: new Date(Date.UTC(2026, 8, 19) + seconds * 1000), accuracy,
  };
}
const points = [point(0, 0), point(600, 100), point(1200, 200), point(1500, 250)];
const route = { idx: 20, routeRequestIdx: 10, name: "선택 코스", score: 80, totalDistance: 1500, totalAscent: null, path: [{ lat: 0, lng: 0 }, { lat: 0, lng: .01 }] };
const environment = { facilityPoints: [], mapLayers: null, slope: null };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sessions.findRunningSessionByIdxAndUserIdx).mockResolvedValue({
    idx: 7, userIdx: 4, routeRecommendationIdx: 20, status: "COMPLETED",
    startedAt: points[0]!.recordedAt, finishedAt: points[3]!.recordedAt,
    distance: 1500, averagePace: 250 / 1.5,
  });
  vi.mocked(tracks.findTrackpointsBySessionIdx).mockResolvedValue(points);
  vi.mocked(routes.findRouteDetailByIdx).mockResolvedValue(route as Awaited<ReturnType<typeof routes.findRouteDetailByIdx>>);
  vi.mocked(sessions.findRunningTrackAnalysis).mockResolvedValue(null);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([environment, environment])));
});
afterEach(() => vi.unstubAllGlobals());

test("1km 경계를 보간하고 잔여 구간의 거리·시간·페이스를 보존한다", () => {
  const result = buildRunningSegments(points);
  expect(result.segments).toHaveLength(2);
  const [first, last] = result.segments;
  expect(first!.distanceTo).toBeCloseTo(1000);
  expect(first!.durationSeconds).toBeCloseTo(1000 / 6);
  expect(first!.pace).toBeCloseTo(last!.pace);
  expect(last!.distanceFrom).toBeCloseTo(1000);
  expect(last!.distanceTo).toBeCloseTo(1500);
  expect(first!.path.at(-1)).toEqual(last!.path[0]);
  expect(result.segments.reduce((sum, part) => sum + part.durationSeconds, 0)).toBeCloseTo(250);
  expect(result.trackPaths).toHaveLength(1);
});

test("GPS 단절과 비정상 속도는 거리로 더하거나 직선으로 잇지 않는다", () => {
  const result = buildRunningSegments([
    point(0, 0), point(100, 20), point(1000, 200), point(1100, 220),
    point(10000, 221), point(10100, 241),
  ]);
  expect(result.gapCount).toBe(2);
  expect(result.trackPaths).toHaveLength(3);
  expect(result.segments.at(-1)!.distanceTo).toBeCloseTo(300);
  expect(result.segments.reduce((sum, part) => sum + part.durationSeconds, 0)).toBeCloseTo(60);
});

test("낮은 정확도·정지 기록·동일 시간을 처리한다", () => {
  expect(buildRunningSegments([point(0, 0), point(0, 5)]).trackPaths).toEqual([]);
  const result = buildRunningSegments([point(0, 0, null), point(0, 10), point(9999, 12, 100), point(100, 30)]);
  expect(result.excludedPointCount).toBe(1);
  expect(result.segments[0]!.durationSeconds).toBeCloseTo(30);
  expect(result.segments[0]!.pace).toBeCloseTo(300);
  expect(buildRunningSegments([point(0, 0), point(100, 0)]).segments).toEqual([]);
  expect(buildRunningSegments([]).trackPaths).toEqual([]);
});

test("소유권 검사 실패 시 경로·GPS·워커 조회를 하지 않는다", async () => {
  vi.mocked(sessions.findRunningSessionByIdxAndUserIdx).mockResolvedValue(null);
  await expect(getRunningDetail(99, 7)).rejects.toMatchObject({ status: 404 });
  expect(sessions.findRunningSessionByIdxAndUserIdx).toHaveBeenCalledWith(7, 99);
  expect(tracks.findTrackpointsBySessionIdx).not.toHaveBeenCalled();
  expect(routes.findRouteDetailByIdx).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

test("완료 기록 분석을 캐시하고 GPS가 바뀌면 다시 분석한다", async () => {
  const first = await getRunningDetail(4, 7);
  expect(first.analysisStatus).toBe("AVAILABLE");
  expect(first.segments.every(part => part.environment !== null)).toBe(true);
  const cache = vi.mocked(sessions.saveRunningTrackAnalysis).mock.calls[0]![1];
  vi.mocked(sessions.findRunningTrackAnalysis).mockResolvedValue(cache);
  await getRunningDetail(4, 7);
  expect(fetch).toHaveBeenCalledTimes(1);

  vi.mocked(tracks.findTrackpointsBySessionIdx).mockResolvedValue([...points, point(1600, 270)]);
  await getRunningDetail(4, 7);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("워커 장애나 분석 개수 오류에도 경로·주행 구간을 반환한다", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
  const result = await getRunningDetail(4, 7);
  expect(result.analysisStatus).toBe("UNAVAILABLE");
  expect(result.route?.idx).toBe(20);
  expect(result.trackPaths).toHaveLength(1);
  expect(result.segments).toHaveLength(2);
  vi.mocked(fetch).mockResolvedValueOnce(Response.json([environment]));
  expect((await getRunningDetail(4, 7)).analysisStatus).toBe("UNAVAILABLE");
  expect(sessions.saveRunningTrackAnalysis).not.toHaveBeenCalled();
});

test("GPS가 없는 기존 러닝은 선택 코스만 제공한다", async () => {
  vi.mocked(tracks.findTrackpointsBySessionIdx).mockResolvedValue([]);
  const result = await getRunningDetail(4, 7);
  expect(result.analysisStatus).toBe("INSUFFICIENT");
  expect(result.route?.idx).toBe(20);
  expect(fetch).not.toHaveBeenCalled();
});

test("관리자는 같은 추천 요청의 미선택 코스만 함께 조회한다", async () => {
  vi.mocked(admin.findSessionOwner).mockResolvedValue(4);
  vi.mocked(requests.findRouteRequestByIdxAndUserIdx).mockResolvedValue({ idx: 10 } as Awaited<ReturnType<typeof requests.findRouteRequestByIdxAndUserIdx>>);
  vi.mocked(routes.findRouteRecommendationsByRequestIdx).mockResolvedValue(
    [{ idx: 20 }, { idx: 21 }, { idx: 22 }] as Awaited<ReturnType<typeof routes.findRouteRecommendationsByRequestIdx>>,
  );
  vi.mocked(routes.findRouteDetailByIdx).mockImplementation(async idx => ({ ...route, idx }) as Awaited<ReturnType<typeof routes.findRouteDetailByIdx>>);
  const result = await getAdminRunningDetail(7);
  expect(requests.findRouteRequestByIdxAndUserIdx).toHaveBeenCalledWith(10, 4);
  expect(routes.findRouteRecommendationsByRequestIdx).toHaveBeenCalledWith(10);
  expect(result.alternatives.map(item => item.idx)).toEqual([21, 22]);
  expect(routes.findRouteDetailByIdx).toHaveBeenCalledTimes(3);
});

test("관리자 기간 조회는 잘못된 날짜·과도한 범위·회원 번호를 거절한다", () => {
  expect(adminRunningQuerySchema.safeParse({ from: "2026-09-01", to: "2026-09-19", userIdx: "4" }).success).toBe(true);
  for (const query of [
    { from: "2026-09-20", to: "2026-09-19" },
    { from: "2026-02-30" }, { from: "2020-01-01", to: "2026-09-19" },
    { userIdx: "-1" }, { page: "0" },
  ]) expect(adminRunningQuerySchema.safeParse(query).success).toBe(false);
});
