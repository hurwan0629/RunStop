import type { Request, Response, NextFunction } from "express";
import {
  currentGoalResponseSchema,
  goalCreateSchema,
  goalParamsSchema,
  goalResponseSchema,
  stopGoalResponseSchema,
} from "../dto/goals/goal.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  createRunningGoal as createRunningGoalService,
  getCurrentRunningGoal as getCurrentRunningGoalService,
  stopRunningGoal as stopRunningGoalService,
} from "../services/goals.service.js";

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

/**
 * 현재 활성 상태인 주간 또는 월간 러닝 목표를 반환합니다.
 */
export async function getCurrentGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const result = await getCurrentRunningGoalService(userIdx);

  res.json({
    success: true,
    data: currentGoalResponseSchema.parse(result),
  });
}

/**
 * 새 주간 또는 월간 러닝 목표를 생성합니다.
 */
export async function createGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = goalCreateSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_GOAL_CREATE_REQUEST",
      message: "목표 생성 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await createRunningGoalService(userIdx, parseResult.data);

  res.json({
    success: true,
    data: goalResponseSchema.parse(result),
  });
}

/**
 * 현재 사용자의 활성 러닝 목표를 중지합니다.
 */
export async function stopGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = goalParamsSchema.safeParse(req.params);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_GOAL_PARAMS",
      message: "목표 경로 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await stopRunningGoalService(userIdx, parseResult.data.goalIdx);

  res.json({
    success: true,
    data: stopGoalResponseSchema.parse(result),
  });
}
