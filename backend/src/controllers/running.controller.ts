import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { runningFinishSchema } from "../dto/running/running-finish.dto.js";
import { runningHistoryResponseSchema } from "../dto/running/running-history.dto.js";
import { runningListQuerySchema } from "../dto/running/running-list-query.dto.js";
import {
  runningFinishResponseSchema,
  runningPaceResponseSchema,
  runningStartResponseSchema,
  runningTrackpointsResponseSchema,
} from "../dto/running/running-response.dto.js";
import { runningStartSchema } from "../dto/running/running-start.dto.js";
import { runningTrackpointsSchema } from "../dto/running/running-trackpoint.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  finishRunningSession as finishRunningSessionService,
  getRunningPace as getRunningPaceService,
  listRunningHistory,
  saveRunningTrackpoints as saveRunningTrackpointsService,
  startRunningSession as startRunningSessionService,
} from "../services/running.service.js";

const runningSessionParamsSchema = z.object({
  sessionIdx: z.coerce.number().int().positive(),
});

function getAuthenticatedUserIdx(req: Request): number {
  if (!req.user) {
    throw new ApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증이 필요합니다.",
    });
  }

  return req.user.idx;
}

function parseSessionIdx(req: Request): number {
  const parseResult = runningSessionParamsSchema.safeParse(req.params);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_RUNNING_SESSION_PARAMS",
      message: "러닝 세션 경로 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  return parseResult.data.sessionIdx;
}

/**
 * 현재 사용자의 러닝 기록 목록을 반환합니다.
 */
export async function listRunningSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  // req.users 있는지 확인
  const userIdx = getAuthenticatedUserIdx(req);
  // running list 요청 스키마 검사
  const parseResult = runningListQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_RUNNING_HISTORY_QUERY",
      message: "러닝 기록 조회 조건이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  // 사용자 idx에 대한 page, limit + optional(date range) 로 조회하기
  // IN_PROGRESS는 제외하고 가져오기
  // 시간 단위로 나누지는 않음
  const result = await listRunningHistory(userIdx, parseResult.data);

  res.json({
    success: true,
    data: runningHistoryResponseSchema.parse(result),
  });
}

/**
 * 선택한 추천 코스를 기준으로 러닝 세션을 시작합니다.
 */
export async function startRunningSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = runningStartSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_RUNNING_START_REQUEST",
      message: "러닝 시작 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await startRunningSessionService(userIdx, parseResult.data);

  res.json({
    success: true,
    data: runningStartResponseSchema.parse(result),
  });
}

/**
 * 진행 중인 러닝 세션에 하나 이상의 GPS 트랙포인트를 저장합니다.
 */
export async function saveRunningTrackpoints(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const sessionIdx = parseSessionIdx(req);
  const parseResult = runningTrackpointsSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_RUNNING_TRACKPOINTS_REQUEST",
      message: "트랙포인트 저장 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await saveRunningTrackpointsService(userIdx, sessionIdx, parseResult.data);

  res.json({
    success: true,
    data: runningTrackpointsResponseSchema.parse(result),
  });
}

/**
 * 러닝 세션을 종료하고 실제 거리 및 평균 페이스를 계산합니다.
 */
export async function finishRunningSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const sessionIdx = parseSessionIdx(req);
  const parseResult = runningFinishSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_RUNNING_FINISH_REQUEST",
      message: "러닝 종료 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await finishRunningSessionService(userIdx, sessionIdx, parseResult.data);

  res.json({
    success: true,
    data: runningFinishResponseSchema.parse(result),
  });
}

/**
 * 러닝 세션의 1km 단위 페이스 분석 결과를 반환합니다.
 */
export async function getRunningPace(req: Request, res: Response, next: NextFunction): Promise<void> {
  // req.users 확인하기
  const userIdx = getAuthenticatedUserIdx(req);
  // sessionIdx 잘 있나 확인
  const sessionIdx = parseSessionIdx(req);
  // usersIdx & sessionIdx의 pace 가져오기 (running_sessions.pace)
  const result = await getRunningPaceService(userIdx, sessionIdx);

  res.json({
    success: true,
    data: runningPaceResponseSchema.parse(result),
  });
}
