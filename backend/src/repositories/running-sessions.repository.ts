import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type RunningSummaryRow = {
  totalCount: number;
  totalDistance: number;
  bestPace: number | null;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

/**
 * 기록 출력에 필요한 사용자의 러닝 세션 목록을 조회합니다.
 */
export async function findRunningSessionsByUserIdx() {
}

/**
 * 사용자의 가장 최근 완료된 러닝 세션을 조회합니다.
 */
export async function findLatestCompletedSessionByUserIdx() {
}

/**
 * 새 진행 중 러닝 세션을 추가합니다.
 */
export async function createRunningSession() {
}

/**
 * 사용자가 소유한 러닝 세션을 조회합니다.
 */
export async function findRunningSessionByIdxAndUserIdx() {
}

/**
 * 종료, 중지, 실패 이후 러닝 세션 결과를 갱신합니다.
 */
export async function updateRunningSessionResult() {
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
