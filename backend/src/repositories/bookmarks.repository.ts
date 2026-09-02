import type { Pool, PoolClient } from "pg";
import type { CoordinateDTO } from "../dto/common/coordinate.dto.js";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type PointBookmarkRow = {
  bookmarkIdx: number;
  name: string;
  point: CoordinateDTO;
};

export type CreatePointBookmarkInput = {
  userIdx: number;
  name: string;
  point: CoordinateDTO;
};

export type BookmarkListQuery = {
  page: number;
  limit: number;
};

export type RouteBookmarkRow = {
  bookmarkIdx: number;
  routeRecommendationIdx: number;
  name: string;
  totalDistance: number | null;
  totalAscent: number | null;
  slopeStd: number | null;
};

export type RouteBookmarkCreateRow = {
  bookmarkIdx: number;
  routeRecommendationIdx: number;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function parsePointGeoJson(value: unknown): CoordinateDTO {
  if (
    typeof value === "object"
    && value !== null
    && "coordinates" in value
    && Array.isArray(value.coordinates)
    && typeof value.coordinates[0] === "number"
    && typeof value.coordinates[1] === "number"
  ) {
    return {
      longitude: value.coordinates[0],
      latitude: value.coordinates[1],
    };
  }

  throw new Error("장소 즐겨찾기 좌표를 해석할 수 없습니다.");
}

/**
 * 사용자가 소유한 장소 즐겨찾기를 조회합니다.
 */
export async function findPointBookmarksByUserIdx(
  userIdx: number,
  query: BookmarkListQuery,
  client?: QueryClient,
): Promise<PointBookmarkRow[]> {
  const offset = (query.page - 1) * query.limit;
  const result = await getQueryClient(client).query<{
    bookmark_idx: number;
    name: string;
    point: unknown;
  }>(
    `
      SELECT
        idx AS bookmark_idx,
        name,
        ST_AsGeoJSON(point)::json AS point
      FROM service.point_bookmarks
      WHERE users_idx = $1
      ORDER BY idx DESC
      LIMIT $2
      OFFSET $3
    `,
    [userIdx, query.limit, offset],
  );

  return result.rows.map((row) => ({
    bookmarkIdx: row.bookmark_idx,
    name: row.name,
    point: parsePointGeoJson(row.point),
  }));
}

/**
 * 장소 즐겨찾기를 추가합니다.
 */
export async function createPointBookmark(
  input: CreatePointBookmarkInput,
  client?: QueryClient,
): Promise<PointBookmarkRow> {
  const result = await getQueryClient(client).query<{
    bookmark_idx: number;
    name: string;
    point: unknown;
  }>(
    `
      INSERT INTO service.point_bookmarks (
        users_idx,
        name,
        point
      )
      VALUES (
        $1,
        $2,
        ST_SetSRID(ST_MakePoint($3, $4), 4326)
      )
      RETURNING
        idx AS bookmark_idx,
        name,
        ST_AsGeoJSON(point)::json AS point
    `,
    [input.userIdx, input.name, input.point.longitude, input.point.latitude],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("장소 즐겨찾기 생성 결과를 확인할 수 없습니다.");
  }

  return {
    bookmarkIdx: row.bookmark_idx,
    name: row.name,
    point: parsePointGeoJson(row.point),
  };
}

/**
 * 사용자가 소유한 장소 즐겨찾기를 삭제합니다.
 */
export async function deletePointBookmarkByIdxAndUserIdx(
  bookmarkIdx: number,
  userIdx: number,
  client?: QueryClient,
): Promise<boolean> {
  const result = await getQueryClient(client).query(
    `
      DELETE FROM service.point_bookmarks
      WHERE idx = $1
        AND users_idx = $2
    `,
    [bookmarkIdx, userIdx],
  );

  return (result.rowCount ?? 0) > 0;
}

/**
 * 사용자가 소유한 코스 즐겨찾기를 조회합니다.
 */
export async function findRouteBookmarksByUserIdx(
  userIdx: number,
  query: BookmarkListQuery,
  client?: QueryClient,
): Promise<RouteBookmarkRow[]> {
  const offset = (query.page - 1) * query.limit;
  const result = await getQueryClient(client).query<{
    bookmark_idx: number;
    route_recommendation_idx: number;
    name: string;
    total_distance: number | null;
    total_ascent: string | number | null;
    slope_std: string | number | null;
  }>(
    `
      SELECT
        bookmarks.idx AS bookmark_idx,
        recommendations.idx AS route_recommendation_idx,
        recommendations.name,
        recommendations.total_distance,
        recommendations.total_ascent,
        recommendations.slope_std
      FROM service.route_bookmarks AS bookmarks
      INNER JOIN service.route_recommendations AS recommendations
        ON recommendations.idx = bookmarks.route_recommendations_idx
      WHERE bookmarks.users_idx = $1
      ORDER BY bookmarks.idx DESC
      LIMIT $2
      OFFSET $3
    `,
    [userIdx, query.limit, offset],
  );

  return result.rows.map((row) => ({
    bookmarkIdx: row.bookmark_idx,
    routeRecommendationIdx: row.route_recommendation_idx,
    name: row.name,
    totalDistance: row.total_distance,
    totalAscent: row.total_ascent === null ? null : Number(row.total_ascent),
    slopeStd: row.slope_std === null ? null : Number(row.slope_std),
  }));
}

/**
 * 코스 즐겨찾기를 추가합니다.
 */
export async function createRouteBookmark(
  userIdx: number,
  routeRecommendationIdx: number,
  client?: QueryClient,
): Promise<RouteBookmarkCreateRow> {
  const result = await getQueryClient(client).query<{
    bookmark_idx: number;
    route_recommendation_idx: number;
  }>(
    `
      INSERT INTO service.route_bookmarks (
        users_idx,
        route_recommendations_idx
      )
      VALUES ($1, $2)
      RETURNING
        idx AS bookmark_idx,
        route_recommendations_idx AS route_recommendation_idx
    `,
    [userIdx, routeRecommendationIdx],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("코스 즐겨찾기 생성 결과를 확인할 수 없습니다.");
  }

  return {
    bookmarkIdx: row.bookmark_idx,
    routeRecommendationIdx: row.route_recommendation_idx,
  };
}

/**
 * 사용자가 소유한 코스 즐겨찾기를 삭제합니다.
 */
export async function deleteRouteBookmarkByIdxAndUserIdx(
  bookmarkIdx: number,
  userIdx: number,
  client?: QueryClient,
): Promise<boolean> {
  const result = await getQueryClient(client).query(
    `
      DELETE FROM service.route_bookmarks
      WHERE idx = $1
        AND users_idx = $2
    `,
    [bookmarkIdx, userIdx],
  );

  return (result.rowCount ?? 0) > 0;
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

/**
 * 사용자가 특정 추천 코스를 즐겨찾기했는지 확인합니다.
 */
export async function existsRouteBookmark(
  userIdx: number,
  routeRecommendationIdx: number,
  client?: QueryClient,
): Promise<boolean> {
  const result = await getQueryClient(client).query<{
    exists: boolean;
  }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM service.route_bookmarks
        WHERE users_idx = $1
          AND route_recommendations_idx = $2
      ) AS exists
    `,
    [userIdx, routeRecommendationIdx],
  );

  return result.rows[0]?.exists ?? false;
}
