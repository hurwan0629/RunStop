import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type RunningSessionStatus = "IN_PROGRESS" | "COMPLETED" | "STOPPED" | "FAILED";

export type RunningSessionRow = {
  idx: number;
  userIdx: number;
  routeRecommendationIdx: number;
  status: RunningSessionStatus;
  startedAt: Date;
  finishedAt: Date | null;
  distance: number | null;
  averagePace: number | null;
};

export type RunningSummaryRow = {
  totalCount: number;
  totalDistance: number;
  bestPace: number | null;
};

export type RunningSessionsListQuery = {
  page: number;
  limit: number;
  from?: string | undefined;
  to?: string | undefined;
};

export type CreateRunningSessionInput = {
  userIdx: number;
  routeRecommendationIdx: number;
  startedAt: string;
};

export type UpdateRunningSessionResultInput = {
  sessionIdx: number;
  status: Extract<RunningSessionStatus, "COMPLETED" | "STOPPED" | "FAILED">;
  finishedAt: string;
  distance: number;
  averagePace: number | null;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function mapRunningSessionRow(row: {
  idx: number;
  users_idx: number;
  route_recommendations_idx: number;
  status: RunningSessionStatus;
  started_at: Date;
  finished_at: Date | null;
  distance: number | null;
  average_pace: number | null;
}): RunningSessionRow {
  return {
    idx: row.idx,
    userIdx: row.users_idx,
    routeRecommendationIdx: row.route_recommendations_idx,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    distance: row.distance,
    averagePace: row.average_pace,
  };
}

/**
 * 기록 출력에 필요한 사용자의 러닝 세션 목록을 조회합니다.
 */
export async function findRunningSessionsByUserIdx(
  userIdx: number,
  query: RunningSessionsListQuery,
  client?: QueryClient,
): Promise<RunningSessionRow[]> {
  const offset = (query.page - 1) * query.limit;
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    route_recommendations_idx: number;
    status: RunningSessionStatus;
    started_at: Date;
    finished_at: Date | null;
    distance: number | null;
    average_pace: number | null;
  }>(
    `
      SELECT
        idx,
        users_idx,
        route_recommendations_idx,
        status,
        started_at,
        finished_at,
        distance,
        average_pace
      FROM service.running_sessions
      WHERE users_idx = $1
        AND status <> 'IN_PROGRESS'
        AND ($2::date IS NULL OR started_at >= $2::date)
        AND ($3::date IS NULL OR started_at < ($3::date + INTERVAL '1 day'))
      ORDER BY started_at DESC, idx DESC
      LIMIT $4
      OFFSET $5
    `,
    [userIdx, query.from ?? null, query.to ?? null, query.limit, offset],
  );

  return result.rows.map(mapRunningSessionRow);
}

/**
 * 사용자의 가장 최근 완료된 러닝 세션을 조회합니다.
 */
export async function findLatestCompletedSessionByUserIdx() {
}

/**
 * 새 진행 중 러닝 세션을 추가합니다.
 */
export async function createRunningSession(
  input: CreateRunningSessionInput,
  client?: QueryClient,
): Promise<RunningSessionRow> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    route_recommendations_idx: number;
    status: RunningSessionStatus;
    started_at: Date;
    finished_at: Date | null;
    distance: number | null;
    average_pace: number | null;
  }>(
    `
      INSERT INTO service.running_sessions (
        users_idx,
        route_recommendations_idx,
        status,
        started_at
      )
      VALUES ($1, $2, 'IN_PROGRESS', $3::timestamptz)
      RETURNING
        idx,
        users_idx,
        route_recommendations_idx,
        status,
        started_at,
        finished_at,
        distance,
        average_pace
    `,
    [input.userIdx, input.routeRecommendationIdx, input.startedAt],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("러닝 세션 생성 결과를 확인할 수 없습니다.");
  }

  return mapRunningSessionRow(row);
}

/**
 * 사용자가 소유한 러닝 세션을 조회합니다.
 */
export async function findRunningSessionByIdxAndUserIdx(
  sessionIdx: number,
  userIdx: number,
  client?: QueryClient,
): Promise<RunningSessionRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    route_recommendations_idx: number;
    status: RunningSessionStatus;
    started_at: Date;
    finished_at: Date | null;
    distance: number | null;
    average_pace: number | null;
  }>( // 특정 세션이 userIdx에 올바르게 있을 경우 가져와줍니다. (보통 올바릅니다.)
    `
      SELECT
        idx,
        users_idx,
        route_recommendations_idx,
        status,
        started_at,
        finished_at,
        distance,
        average_pace
      FROM service.running_sessions
      WHERE idx = $1
        AND users_idx = $2
      LIMIT 1
    `,
    [sessionIdx, userIdx],
  );

  const row = result.rows[0];

  return row ? mapRunningSessionRow(row) : null;
}

/**
 * 사용자가 아직 종료하지 않은 러닝 세션을 조회합니다.
 */
export async function findInProgressSessionByUserIdx(
  userIdx: number,
  client?: QueryClient,
): Promise<RunningSessionRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    route_recommendations_idx: number;
    status: RunningSessionStatus;
    started_at: Date;
    finished_at: Date | null;
    distance: number | null;
    average_pace: number | null;
  }>(
    `
      SELECT
        idx,
        users_idx,
        route_recommendations_idx,
        status,
        started_at,
        finished_at,
        distance,
        average_pace
      FROM service.running_sessions
      WHERE users_idx = $1
        AND status = 'IN_PROGRESS'
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [userIdx],
  );

  const row = result.rows[0];

  return row ? mapRunningSessionRow(row) : null;
}

/**
 * 종료, 중지, 실패 이후 러닝 세션 결과를 갱신합니다.
 */
export async function updateRunningSessionResult(
  input: UpdateRunningSessionResultInput,
  client?: QueryClient,
): Promise<RunningSessionRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    route_recommendations_idx: number;
    status: RunningSessionStatus;
    started_at: Date;
    finished_at: Date | null;
    distance: number | null;
    average_pace: number | null;
  }>(
    `
      UPDATE service.running_sessions
      SET
        status = $2::service.running_session_status,
        finished_at = $3::timestamptz,
        distance = $4,
        average_pace = $5
      WHERE idx = $1
        AND status = 'IN_PROGRESS'
      RETURNING
        idx,
        users_idx,
        route_recommendations_idx,
        status,
        started_at,
        finished_at,
        distance,
        average_pace
    `,
    [
      input.sessionIdx,
      input.status,
      input.finishedAt,
      input.distance,
      input.averagePace,
    ],
  );

  const row = result.rows[0];

  return row ? mapRunningSessionRow(row) : null;
}

/**
 * 사용자의 전체 러닝 세션 통계를 집계합니다.
 */
export async function summarizeRunningSessionsByUserIdx(
  userIdx: number,
  client?: QueryClient,
): Promise<RunningSummaryRow> {
  const result = await getQueryClient(client).query<{
    total_count: string;
    total_distance: string | null;
    best_pace: number | null;
  }>(
    `
      SELECT
        COUNT(*)::text AS total_count,
        COALESCE(SUM(distance), 0)::text AS total_distance,
        MIN(average_pace) AS best_pace
      FROM service.running_sessions
      WHERE users_idx = $1
        AND status <> 'IN_PROGRESS'
    `,
    [userIdx],
  );

  const row = result.rows[0];

  return {
    totalCount: row ? Number(row.total_count) : 0,
    totalDistance: row ? Number(row.total_distance ?? 0) : 0,
    bestPace: row?.best_pace ?? null,
  };
}

/**
 * 특정 기간 안에서 사용자의 확정된 러닝 거리 합계를 계산합니다.
 */
export async function sumRunningDistanceByUserIdxAndPeriod(
  userIdx: number,
  startDate: string,
  endDate: string,
  client?: QueryClient,
): Promise<number> {
  const result = await getQueryClient(client).query<{
    progress_distance: string | null;
  }>(
    `
      SELECT
        COALESCE(SUM(distance), 0)::text AS progress_distance
      FROM service.running_sessions
      WHERE users_idx = $1
        AND status <> 'IN_PROGRESS'
        AND started_at >= $2::date
        AND started_at < ($3::date + INTERVAL '1 day')
    `,
    [userIdx, startDate, endDate],
  );

  return Number(result.rows[0]?.progress_distance ?? 0);
}

/**
 * 특정 목표 기간에서 오늘까지의 확정된 러닝 거리 합계를 계산합니다.
 */
export async function sumRunningDistanceByUserIdxAndGoalPeriodUntilToday(
  userIdx: number,
  startDate: string,
  endDate: string,
  client?: QueryClient,
): Promise<number> {
  const result = await getQueryClient(client).query<{
    progress_distance: string | null;
  }>(
    `
      SELECT
        COALESCE(SUM(distance), 0)::text AS progress_distance
      FROM service.running_sessions
      WHERE users_idx = $1
        AND status <> 'IN_PROGRESS'
        AND started_at >= $2::date
        AND started_at < (LEAST($3::date, CURRENT_DATE) + INTERVAL '1 day')
    `,
    [userIdx, startDate, endDate],
  );

  return Number(result.rows[0]?.progress_distance ?? 0);
}
