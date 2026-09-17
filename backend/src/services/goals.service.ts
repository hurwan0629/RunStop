import type { Pool, PoolClient } from "pg";
import type {
  CurrentGoalResponseDTO,
  GoalCreateDTO,
  GoalDTO,
  StopGoalResponseDTO,
} from "../dto/goals/goal.dto.js";
import { withTransaction } from "../infra/db/transaction.js";
import { logger } from "../logging/logger.js";
import { ApiError } from "../middleware/error.js";
import {
  createRunningGoal as createRunningGoalRepository,
  findActiveGoalByUserIdx,
  findRunningGoalByIdxAndUserIdx,
  stopRunningGoal as stopRunningGoalRepository,
  updateExpiredGoals,
  type ActiveGoalRow,
} from "../repositories/running-goals.repository.js";
import { sumRunningDistanceByUserIdxAndGoalPeriodUntilToday } from "../repositories/running-sessions.repository.js";

type QueryClient = Pool | PoolClient;

function toGoalDTO(goal: ActiveGoalRow): GoalDTO {
  return {
    idx: goal.idx,
    goalType: goal.goalType,
    targetDistance: goal.targetDistance,
    status: goal.status,
    startDate: goal.startDate,
    endDate: goal.endDate,
    finishedAt: goal.finishedAt ? goal.finishedAt.toISOString() : null,
  };
}

function calculateProgressRate(distance: number, targetDistance: number): number {
  if (targetDistance <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((distance / targetDistance) * 1000) / 10);
}

/**
 * 현재 사용자의 활성 러닝 목표와 진행률을 반환합니다.
 */
export async function getCurrentRunningGoal(userIdx: number): Promise<CurrentGoalResponseDTO> {
  logger.info({ serviceName: "goals", action: "getCurrentRunningGoal", userIdx }, "service:start");

  await refreshExpiredGoals(userIdx);

  const goal = await findActiveGoalByUserIdx(userIdx);

  if (!goal) {
    logger.info({ serviceName: "goals", action: "getCurrentRunningGoal", userIdx, hasGoal: false }, "service:success");

    return {
      goal: null,
      progress: {
        distance: 0,
        rate: 0,
      },
    };
  }

  const distance = await sumRunningDistanceByUserIdxAndGoalPeriodUntilToday(
    userIdx,
    goal.startDate,
    goal.endDate,
  );
  const rate = calculateProgressRate(distance, goal.targetDistance);

  logger.info({
    serviceName: "goals",
    action: "getCurrentRunningGoal",
    userIdx,
    goalIdx: goal.idx,
    progressDistance: distance,
    progressRate: rate,
  }, "service:success");

  return {
    goal: toGoalDTO(goal),
    progress: {
      distance,
      rate,
    },
  };
}

/**
 * 현재 사용자의 주간 또는 월간 러닝 목표를 생성합니다.
 */
export async function createRunningGoal(
  userIdx: number,
  dto: GoalCreateDTO,
): Promise<GoalDTO> {
  logger.info({
    serviceName: "goals",
    action: "createRunningGoal",
    userIdx,
    goalType: dto.goalType,
    targetDistance: dto.targetDistance,
  }, "service:start");

  if (dto.startDate > dto.endDate) {
    logger.warn({ serviceName: "goals", action: "createRunningGoal", userIdx }, "service:invalid_period");

    throw new ApiError({
      status: 400,
      code: "INVALID_GOAL_PERIOD",
      message: "목표 시작일은 종료일보다 늦을 수 없습니다.",
    });
  }

  const goal = await withTransaction(async (client) => {
    await refreshExpiredGoals(userIdx, client);

    const activeGoal = await findActiveGoalByUserIdx(userIdx, client);

    if (activeGoal) {
      logger.warn({
        serviceName: "goals",
        action: "createRunningGoal",
        userIdx,
        activeGoalIdx: activeGoal.idx,
      }, "service:active_goal_already_exists");

      throw new ApiError({
        status: 409,
        code: "ACTIVE_GOAL_ALREADY_EXISTS",
        message: "이미 진행 중인 목표가 있습니다.",
      });
    }

    return createRunningGoalRepository({
      userIdx,
      goalType: dto.goalType,
      targetDistance: dto.targetDistance,
      startDate: dto.startDate,
      endDate: dto.endDate,
    }, client);
  });

  logger.info({
    serviceName: "goals",
    action: "createRunningGoal",
    userIdx,
    goalIdx: goal.idx,
  }, "service:success");

  return toGoalDTO(goal);
}

/**
 * 현재 사용자의 활성 러닝 목표를 중지합니다.
 */
export async function stopRunningGoal(
  userIdx: number,
  goalIdx: number,
): Promise<StopGoalResponseDTO> {
  logger.info({ serviceName: "goals", action: "stopRunningGoal", userIdx, goalIdx }, "service:start");

  await refreshExpiredGoals(userIdx);

  const goal = await findRunningGoalByIdxAndUserIdx(goalIdx, userIdx);

  if (!goal) {
    logger.warn({ serviceName: "goals", action: "stopRunningGoal", userIdx, goalIdx }, "service:goal_not_found");

    throw new ApiError({
      status: 404,
      code: "GOAL_NOT_FOUND",
      message: "러닝 목표를 찾을 수 없습니다.",
    });
  }

  if (goal.status !== "ACTIVE") {
    logger.warn({
      serviceName: "goals",
      action: "stopRunningGoal",
      userIdx,
      goalIdx,
      status: goal.status,
    }, "service:goal_not_stoppable");

    throw new ApiError({
      status: 409,
      code: "GOAL_NOT_STOPPABLE",
      message: "진행 중인 목표만 중지할 수 있습니다.",
    });
  }

  const stopped = await stopRunningGoalRepository(goalIdx, userIdx);

  if (!stopped || !stopped.finishedAt) {
    logger.error({ serviceName: "goals", action: "stopRunningGoal", userIdx, goalIdx }, "service:failed");

    throw new ApiError({
      status: 409,
      code: "GOAL_STOP_FAILED",
      message: "러닝 목표 중지 처리에 실패했습니다.",
    });
  }

  logger.info({ serviceName: "goals", action: "stopRunningGoal", userIdx, goalIdx }, "service:success");

  return {
    idx: stopped.idx,
    status: "STOPPED",
    finishedAt: stopped.finishedAt.toISOString(),
  };
}

/**
 * 만료된 활성 목표를 최종 상태로 갱신합니다.
 */
export async function refreshExpiredGoals(
  userIdx: number,
  client?: QueryClient,
): Promise<GoalDTO[]> {
  logger.debug({ serviceName: "goals", action: "refreshExpiredGoals", userIdx }, "service:start");

  const updatedGoals = await updateExpiredGoals(userIdx, client);

  if (updatedGoals.length > 0) {
    logger.info({
      serviceName: "goals",
      action: "refreshExpiredGoals",
      userIdx,
      updatedCount: updatedGoals.length,
      goalIdxs: updatedGoals.map((goal) => goal.idx),
    }, "service:success");
  }

  return updatedGoals.map(toGoalDTO);
}
