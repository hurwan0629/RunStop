import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

/**
 * 사용자가 소유한 장소 즐겨찾기를 조회합니다.
 */
export async function findPointBookmarksByUserIdx() {
}

/**
 * 장소 즐겨찾기를 추가합니다.
 */
export async function createPointBookmark() {
}

/**
 * 사용자가 소유한 장소 즐겨찾기를 삭제합니다.
 */
export async function deletePointBookmarkByIdxAndUserIdx() {
}

/**
 * 사용자가 소유한 코스 즐겨찾기를 조회합니다.
 */
export async function findRouteBookmarksByUserIdx() {
}

/**
 * 코스 즐겨찾기를 추가합니다.
 */
export async function createRouteBookmark() {
}

/**
 * 사용자가 소유한 코스 즐겨찾기를 삭제합니다.
 */
export async function deleteRouteBookmarkByIdxAndUserIdx() {
}

/**
 * 사용자의 코스 즐겨찾기 개수를 계산합니다.
 */
export async function countRouteBookmarksByUserIdx(userIdx: number, client?: QueryClient): Promise<number> {
  const result = await getQueryClient(client).query<{
    count: string;
  }>(
    `
      SELECT COUNT(*)::text AS count
      FROM service.route_bookmarks
      WHERE users_idx = $1
    `,
    [userIdx],
  );

  return Number(result.rows[0]?.count ?? 0);
}
