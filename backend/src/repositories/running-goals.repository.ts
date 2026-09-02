import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type GoalType = "WEEKLY" | "MONTHLY";
export type GoalStatus = "ACTIVE" | "SUCCESS" | "FAILED" | "STOPPED";

export type ActiveGoalRow = {
  idx: number;
  goalType: GoalType;
  targetDistance: number;
  status: GoalStatus;
  startDate: string;
  endDate: string;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

/**
 * 사용자의 활성 주간 또는 월간 목표를 조회합니다.
 */
export async function findActiveGoalByUserIdx(userIdx: number, client?: QueryClient): Promise<ActiveGoalRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    goal_type: GoalType;
    target_distance: number;
    status: GoalStatus;
    start_date: string;
    end_date: string;
  }>(
    `
      SELECT
        idx,
        goal_type,
        target_distance,
        status,
        start_date::text AS start_date,
        end_date::text AS end_date
      FROM service.running_goals
      WHERE users_idx = $1
        AND status = 'ACTIVE'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userIdx],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    idx: row.idx,
    goalType: row.goal_type,
    targetDistance: row.target_distance,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

/**
 * 새 러닝 목표를 추가합니다.
 */
export async function createRunningGoal() {
}

/**
 * 사용자가 소유한 러닝 목표를 중지합니다.
 */
export async function stopRunningGoal() {
}

/**
 * 만료된 활성 목표를 성공 또는 실패 상태로 갱신합니다.
 */
export async function updateExpiredGoals() {
}
