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
  finishedAt: Date | null;
};

export type CreateRunningGoalInput = {
  userIdx: number;
  goalType: GoalType;
  targetDistance: number;
  startDate: string;
  endDate: string;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function mapGoalRow(row: {
  idx: number;
  goal_type: GoalType;
  target_distance: number;
  status: GoalStatus;
  start_date: string;
  end_date: string;
  finished_at: Date | null;
}): ActiveGoalRow {
  return {
    idx: row.idx,
    goalType: row.goal_type,
    targetDistance: row.target_distance,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    finishedAt: row.finished_at,
  };
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
    finished_at: Date | null;
  }>(
    `
      SELECT
        idx,
        goal_type,
        target_distance,
        status,
        start_date::text AS start_date,
        end_date::text AS end_date,
        finished_at
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

  return mapGoalRow(row);
}

/**
 * 사용자가 소유한 러닝 목표를 조회합니다.
 */
export async function findRunningGoalByIdxAndUserIdx(
  goalIdx: number,
  userIdx: number,
  client?: QueryClient,
): Promise<ActiveGoalRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    goal_type: GoalType;
    target_distance: number;
    status: GoalStatus;
    start_date: string;
    end_date: string;
    finished_at: Date | null;
  }>(
    `
      SELECT
        idx,
        goal_type,
        target_distance,
        status,
        start_date::text AS start_date,
        end_date::text AS end_date,
        finished_at
      FROM service.running_goals
      WHERE idx = $1
        AND users_idx = $2
      LIMIT 1
    `,
    [goalIdx, userIdx],
  );

  const row = result.rows[0];

  return row ? mapGoalRow(row) : null;
}

/**
 * 새 러닝 목표를 추가합니다.
 */
export async function createRunningGoal(
  input: CreateRunningGoalInput,
  client?: QueryClient,
): Promise<ActiveGoalRow> {
  const result = await getQueryClient(client).query<{
    idx: number;
    goal_type: GoalType;
    target_distance: number;
    status: GoalStatus;
    start_date: string;
    end_date: string;
    finished_at: Date | null;
  }>(
    `
      INSERT INTO service.running_goals (
        users_idx,
        goal_type,
        target_distance,
        status,
        start_date,
        end_date
      )
      VALUES ($1, $2::service.goal_type, $3, 'ACTIVE', $4::date, $5::date)
      RETURNING
        idx,
        goal_type,
        target_distance,
        status,
        start_date::text AS start_date,
        end_date::text AS end_date,
        finished_at
    `,
    [
      input.userIdx,
      input.goalType,
      input.targetDistance,
      input.startDate,
      input.endDate,
    ],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("러닝 목표 생성 결과를 확인할 수 없습니다.");
  }

  return mapGoalRow(row);
}

/**
 * 사용자가 소유한 러닝 목표를 중지합니다.
 */
export async function stopRunningGoal(
  goalIdx: number,
  userIdx: number,
  client?: QueryClient,
): Promise<ActiveGoalRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    goal_type: GoalType;
    target_distance: number;
    status: GoalStatus;
    start_date: string;
    end_date: string;
    finished_at: Date | null;
  }>(
    `
      UPDATE service.running_goals
      SET
        status = 'STOPPED',
        finished_at = now()
      WHERE idx = $1
        AND users_idx = $2
        AND status = 'ACTIVE'
      RETURNING
        idx,
        goal_type,
        target_distance,
        status,
        start_date::text AS start_date,
        end_date::text AS end_date,
        finished_at
    `,
    [goalIdx, userIdx],
  );

  const row = result.rows[0];

  return row ? mapGoalRow(row) : null;
}

/**
 * 만료된 활성 목표를 성공 또는 실패 상태로 갱신합니다.
 */
export async function updateExpiredGoals(
  userIdx: number,
  client?: QueryClient,
): Promise<ActiveGoalRow[]> {
  const result = await getQueryClient(client).query<{
    idx: number;
    goal_type: GoalType;
    target_distance: number;
    status: GoalStatus;
    start_date: string;
    end_date: string;
    finished_at: Date | null;
  }>(
    `
      WITH expired_goals AS (
        SELECT
          goals.idx,
          CASE
            WHEN COALESCE(SUM(sessions.distance), 0) >= goals.target_distance
              THEN 'SUCCESS'::service.goal_status
            ELSE 'FAILED'::service.goal_status
          END AS next_status
        FROM service.running_goals AS goals
        LEFT JOIN service.running_sessions AS sessions
          ON sessions.users_idx = goals.users_idx
          AND sessions.status <> 'IN_PROGRESS'
          AND sessions.started_at >= goals.start_date
          AND sessions.started_at < (goals.end_date + INTERVAL '1 day')
        WHERE goals.users_idx = $1
          AND goals.status = 'ACTIVE'
          AND goals.end_date < CURRENT_DATE
        GROUP BY goals.idx, goals.target_distance
      )
      UPDATE service.running_goals AS goals
      SET
        status = expired_goals.next_status,
        finished_at = now()
      FROM expired_goals
      WHERE goals.idx = expired_goals.idx
        AND goals.status = 'ACTIVE'
      RETURNING
        goals.idx,
        goals.goal_type,
        goals.target_distance,
        goals.status,
        goals.start_date::text AS start_date,
        goals.end_date::text AS end_date,
        goals.finished_at
    `,
    [userIdx],
  );

  return result.rows.map(mapGoalRow);
}
