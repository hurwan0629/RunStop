import type { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../middleware/error.js";
import { findAdminRuns, findRunningAnalytics } from "../repositories/admin-running.repository.js";
import { getAdminRunningDetail, getAdminRouteRequestDetail } from "../services/admin-running.service.js";

const kstDate = (daysAgo: number) => new Date(Date.now() + 9 * 3600000 - daysAgo * 86400000).toISOString().slice(0, 10);
export const adminRunningQuerySchema = z.object({
  from: z.iso.date().default(() => kstDate(29)),
  to: z.iso.date().default(() => kstDate(0)),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  userIdx: z.coerce.number().int().positive().optional(),
}).refine(value => value.from <= value.to && Date.parse(value.to) - Date.parse(value.from) <= 365 * 86400000,
  { message: "조회 기간은 최대 366일이며 시작일이 종료일보다 늦을 수 없습니다." });

function query(req: Request) {
  const parsed = adminRunningQuerySchema.safeParse(req.query);
  if (!parsed.success) throw new ApiError({ status: 400, code: "INVALID_RUNNING_QUERY", message: "조회 기간·회원 번호를 확인해 주세요." });
  return parsed.data;
}

export async function listRuns(req: Request, res: Response) {
  res.json({ success: true, data: await findAdminRuns(query(req)) });
}

export async function getRun(req: Request, res: Response) {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.sessionIdx);
  if (!parsed.success) throw new ApiError({ status: 400, code: "INVALID_SESSION", message: "러닝 번호를 확인해 주세요." });
  res.json({ success: true, data: await getAdminRunningDetail(parsed.data) });
}

export async function getRouteRequest(req: Request, res: Response) {
  const parsed = z.coerce.number().int().positive().safeParse(req.params.requestIdx);
  if (!parsed.success) throw new ApiError({ status: 400, code: "INVALID_REQUEST", message: "추천 요청 번호를 확인해 주세요." });
  res.json({ success: true, data: await getAdminRouteRequestDetail(parsed.data) });
}

export async function getAnalytics(req: Request, res: Response) {
  const { from, to } = query(req);
  res.json({ success: true, data: { from, to, days: await findRunningAnalytics(from, to) } });
}
