import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";
import type { RouteRequestPointDTO } from "../dto/route/route-request-point.dto.js";
import type { WorkerRoutePointDTO } from "../dto/worker/worker-route-response.dto.js";

type QueryClient = Pool | PoolClient;

export type RoutePointRow = {
  sequence: number;
  pointType: "START" | "WAYPOINT" | "END";
  lat: number;
  lng: number;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

/**
 * 경로 추천 후보의 주요 지점을 추가합니다.
 */
export async function createRoutePoints(
  routeRecommendationIdx: number,
  points: WorkerRoutePointDTO[],
  client?: QueryClient,
): Promise<void> {
  if (points.length === 0) {
    return;
  }

  const values: unknown[] = [];
  const placeholders = points.map((point, index) => {
    const base = index * 8;

    values.push(
      routeRecommendationIdx,
      point.sequence,
      point.title ?? null,
      point.pointType,
      point.elevation ?? null,
      point.slope ?? null,
      point.lng,
      point.lat,
    );

    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::service.route_point_type, $${base + 5}, $${base + 6}, ST_SetSRID(ST_MakePoint($${base + 7}, $${base + 8}), 4326))`;
  });

  await getQueryClient(client).query(
    `
      INSERT INTO service.route_points (
        route_recommendations_idx,
        sequence,
        title,
        point_type,
        elevation,
        slope,
        point
      )
      VALUES ${placeholders.join(", ")}
    `,
    values,
  );
}

/**
 * 경로 추천 후보의 주요 지점을 순서대로 조회합니다.
 */
export async function findRoutePointsByRecommendationIdx(
  routeRecommendationIdx: number,
  client?: QueryClient,
): Promise<RouteRequestPointDTO[]> {
  const result = await getQueryClient(client).query<{
    sequence: number;
    point_type: "START" | "WAYPOINT" | "END";
    lat: string;
    lng: string;
  }>(
    `
      SELECT
        sequence,
        point_type,
        ST_Y(point::geometry) AS lat,
        ST_X(point::geometry) AS lng
      FROM service.route_points
      WHERE route_recommendations_idx = $1
      ORDER BY sequence ASC, idx ASC
    `,
    [routeRecommendationIdx],
  );

  return result.rows.map((row) => ({
    sequence: row.sequence,
    pointType: row.point_type,
    lat: Number(row.lat),
    lng: Number(row.lng),
  }));
}
