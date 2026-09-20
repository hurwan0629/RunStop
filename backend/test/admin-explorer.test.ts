import { beforeEach, expect, test, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../src/infra/db/pool.js", () => ({ getPool: () => ({ query: queryMock }) }));
const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));
vi.mock("../src/repositories/route-requests.repository.js", () => ({
  findRouteRequestByIdxAndUserIdx: vi.fn(), findRouteRequestPoints: vi.fn(),
}));
vi.mock("../src/repositories/route-recommendations.repository.js", () => ({
  findRouteRecommendationsByRequestIdx: vi.fn(), findRouteDetailByIdx: vi.fn(),
}));
import { explorerQuerySchema, getExplorerRequest, listExplorerRequests } from "../src/controllers/admin-explorer.controller.js";
import { findExplorerRequests, findExplorerRuns } from "../src/repositories/admin-explorer.repository.js";
import * as requests from "../src/repositories/route-requests.repository.js";
import * as routes from "../src/repositories/route-recommendations.repository.js";

beforeEach(() => vi.resetAllMocks());

test("조회 파라미터는 날짜, 정수, 유형 및 최대 길이를 검증한다", () => {
  for (const value of [{ page: 0 }, { userIdx: "x" }, { userIdx: 2147483648 }, { from: "2026-02-30" },
    { from: "2026-09-20", to: "2026-09-01" }, { routeType: "unknown" }, { keyword: "a".repeat(101) }]) {
    expect(explorerQuerySchema.safeParse(value).success).toBe(false);
  }
  expect(explorerQuerySchema.parse({ userIdx: "7", routeIdx: "9" })).toMatchObject({ page: 1, userIdx: 7, routeIdx: 9 });
});

test("검색 문자열은 SQL에 삽입하지 않으며 다음 페이지 여부를 정확히 반환한다", async () => {
  queryMock.mockResolvedValue({ rows: Array.from({ length: 21 }, (_, i) => ({ idx: i + 1 })) });
  const keyword = "'; DROP TABLE users; --";
  const result = await findExplorerRequests({ page: 2, keyword });
  expect(result.items).toHaveLength(20);
  expect(result.hasMore).toBe(true);
  expect(queryMock.mock.calls[0]![0]).not.toContain(keyword);
  expect(queryMock.mock.calls[0]![1]).toEqual([null, null, null, keyword, null, null, 20]);
});

test("러닝 목록은 일반 러닝도 포함하고 요청과 후보를 함께 제한할 수 있다", async () => {
  queryMock.mockResolvedValue({ rows: [{ sessionIdx: 8, routeIdx: null, requestIdx: null }] });
  const result = await findExplorerRuns({ page: 1, routeIdx: 5 }, 3);
  expect(queryMock.mock.calls[0]![0]).toContain('LEFT JOIN service.route_recommendations');
  expect(queryMock.mock.calls[0]![1]).toEqual([null, null, null, 3, 0, 5]);
  expect(result.items[0].routeIdx).toBeNull();
});

test("없는 요청은 후보 조회 전에 404를 반환한다", async () => {
  queryMock.mockResolvedValue({ rows: [] });
  await expect(getExplorerRequest({ params: { requestIdx: "8" } } as unknown as Request, {} as Response)).rejects.toMatchObject({ status: 404 });
  expect(routes.findRouteDetailByIdx).not.toHaveBeenCalled();
});

test("요청 상세는 원본 특징과 모든 저장 후보의 좌표를 보존한다", async () => {
  queryMock.mockResolvedValue({ rows: [{ idx: 3, userIdx: 7, nickname: "러너", createdAt: "2026-09-19" }] });
  vi.mocked(requests.findRouteRequestByIdxAndUserIdx).mockResolvedValue({ idx: 3, userIdx: 7, prompt: null, routeType: "LOOP", elementConditions: null, selectedRecommendationIdx: 5 });
  vi.mocked(requests.findRouteRequestPoints).mockResolvedValue([]);
  const features = { toilet_count: 0, aiScore: .0123456789 };
  const route = { idx: 5, routeRequestIdx: 3, name: "공원길", score: 80, totalDistance: 5000, totalAscent: null, slopeStd: null, featureScores: null, featureValues: features,
    path: [{ lat: 37.5, lng: 127 }, { lat: 37.51, lng: 127 }] };
  vi.mocked(routes.findRouteRecommendationsByRequestIdx).mockResolvedValue([route, { ...route, idx: 4 }]);
  vi.mocked(routes.findRouteDetailByIdx).mockImplementation(async idx => ({ ...route, idx }));
  const json = vi.fn();
  await getExplorerRequest({ params: { requestIdx: "3" } } as unknown as Request, { json } as unknown as Response);
  const data = json.mock.calls[0]![0].data;
  expect(data.recommendations.map((r: { idx: number }) => r.idx)).toEqual([4, 5]);
  expect(data.recommendations[1].path).toEqual(route.path);
  expect(data.recommendations[1].featureValues).toEqual(features);
  expect(data.request.selectedRecommendationIdx).toBe(5);
  expect(requests.findRouteRequestByIdxAndUserIdx).toHaveBeenCalledWith(3, 7);
});

test("유효하지 않은 목록 요청은 DB에 도달하지 않는다", async () => {
  await expect(listExplorerRequests({ query: { page: -1 } } as unknown as Request, {} as Response)).rejects.toMatchObject({ status: 400 });
  expect(queryMock).not.toHaveBeenCalled();
});
