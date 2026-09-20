import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../middleware/error.js";
import { findExplorerRequests, findExplorerRequestHeader, findExplorerRuns, findExplorerUserSummary } from "../repositories/admin-explorer.repository.js";
import { findRouteRequestByIdxAndUserIdx, findRouteRequestPoints } from "../repositories/route-requests.repository.js";
import { findRouteRecommendationsByRequestIdx, findRouteDetailByIdx } from "../repositories/route-recommendations.repository.js";
import { recordedRequestSchema, recordedRouteSchema } from "../dto/running/running-detail.dto.js";

export const explorerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  userIdx: z.coerce.number().int().positive().max(2147483647).optional(),
  requestIdx: z.coerce.number().int().positive().max(2147483647).optional(),
  routeIdx: z.coerce.number().int().positive().max(2147483647).optional(),
  from: z.iso.date().optional(), to: z.iso.date().optional(),
  keyword: z.string().trim().max(100).optional(),
  routeType: z.enum(["LOOP", "ONE_WAY", "ROUND_TRIP"]).optional(),
  selection: z.enum(["SELECTED", "UNSELECTED"]).optional(),
}).refine(q => !q.from || !q.to || q.from <= q.to, { message: "조회 기간을 확인해 주세요." });

function query(req: Request) {
  const parsed = explorerQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError({ status: 400, code: "INVALID_EXPLORER_QUERY", message: "검색 조건을 확인해 주세요." });
  return parsed.data;
}

function id(value: unknown) {
  const parsed = z.coerce.number().int().positive().max(2147483647).safeParse(value);
  if (!parsed.success) throw new ApiError({ status: 400, code: "INVALID_EXPLORER_ID", message: "조회 번호를 확인해 주세요." });
  return parsed.data;
}

export async function listExplorerRequests(req: Request, res: Response) {
  res.json({ success: true, data: await findExplorerRequests(query(req)) });
}

export async function listExplorerRuns(req: Request, res: Response) {
  const parsed = query(req);
  res.json({ success: true, data: await findExplorerRuns(parsed, parsed.requestIdx) });
}

export async function getExplorerUserSummary(req: Request, res: Response) {
  res.json({ success: true, data: await findExplorerUserSummary(id(req.params.userIdx)) });
}

export async function getExplorerRequest(req: Request, res: Response) {
  const requestIdx = id(req.params.requestIdx);
  const header = await findExplorerRequestHeader(requestIdx);
  if (!header) throw new ApiError({ status: 404, code: "ROUTE_REQUEST_NOT_FOUND", message: "추천 요청을 찾을 수 없습니다." });

  // 기존 JSON과 경로 조회 함수를 재사용해 원본 값을 그대로 전달한다.
  const [request, points, rows] = await Promise.all([
    findRouteRequestByIdxAndUserIdx(requestIdx, header.userIdx),
    findRouteRequestPoints(requestIdx), findRouteRecommendationsByRequestIdx(requestIdx),
  ]);
  const routes = await Promise.all(rows.map(row => findRouteDetailByIdx(row.idx)));
  res.json({ success: true, data: {
    request: { ...recordedRequestSchema.parse({ ...request, points }), ...header },
    recommendations: routes.filter(route => route !== null)
      .sort((a, b) => a.idx - b.idx)
      .map(route => recordedRouteSchema.parse({ ...route, path: route.path ?? [] })),
  } });
}
