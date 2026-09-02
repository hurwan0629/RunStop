import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";
import type { RouteCoordinateDTO } from "../dto/route/route-coordinate.dto.js";
import type { RouteElementConditionsDTO } from "../dto/route/route-request.dto.js";

type QueryClient = Pool | PoolClient;

export type RouteRequestRow = {
  idx: number;
  userIdx: number;
  prompt: string | null;
  elementConditions: RouteElementConditionsDTO | null;
  selectedRecommendationIdx: number | null;
};

export type CreateRouteRequestInput = {
  userIdx: number;
  prompt?: string | undefined;
  elementConditions: RouteElementConditionsDTO;
};

export type CreateRouteRequestPointInput = {
  sequence: number;
  pointType: "START" | "WAYPOINT" | "END";
  point: RouteCoordinateDTO;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function mapRouteRequestRow(row: {
  idx: number;
  users_idx: number;
  prompt: string | null;
  element_conditions: RouteElementConditionsDTO | null;
  selected_recommendations_idx: number | null;
}): RouteRequestRow {
  return {
    idx: row.idx,
    userIdx: row.users_idx,
    prompt: row.prompt,
    elementConditions: row.element_conditions,
    selectedRecommendationIdx: row.selected_recommendations_idx,
  };
}

/**
 * 경로 추천 요청을 추가합니다.
 */
export async function createRouteRequest(
  input: CreateRouteRequestInput,
  client?: QueryClient,
): Promise<RouteRequestRow> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    prompt: string | null;
    element_conditions: RouteElementConditionsDTO | null;
    selected_recommendations_idx: number | null;
  }>(
    `
      INSERT INTO service.route_requests (
        users_idx,
        prompt,
        element_conditions
      )
      VALUES ($1, $2, $3::jsonb)
      RETURNING
        idx,
        users_idx,
        prompt,
        element_conditions,
        selected_recommendations_idx
    `,
    [input.userIdx, input.prompt ?? null, JSON.stringify(input.elementConditions)],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("경로 추천 요청 생성 결과를 확인할 수 없습니다.");
  }

  return mapRouteRequestRow(row);
}

/**
 * 경로 요청의 출발지, 경유지, 도착지를 추가합니다.
 */
export async function createRouteRequestPoints(
  routeRequestIdx: number,
  points: CreateRouteRequestPointInput[],
  client?: QueryClient,
): Promise<void> {
  if (points.length === 0) {
    return;
  }

  const values: unknown[] = [];
  const placeholders = points.map((point, index) => {
    const base = index * 5;

    values.push(routeRequestIdx, point.sequence, point.pointType, point.point.lng, point.point.lat);

    return `($${base + 1}, $${base + 2}, $${base + 3}::service.route_point_type, ST_SetSRID(ST_MakePoint($${base + 4}, $${base + 5}), 4326))`;
  });

  await getQueryClient(client).query(
    `
      INSERT INTO service.route_request_points (
        route_requests_idx,
        sequence,
        point_type,
        point
      )
      VALUES ${placeholders.join(", ")}
    `,
    values,
  );
}

/**
 * 경로 요청의 선택된 추천 코스를 갱신합니다.
 */
export async function selectRecommendationForRequest(
  routeRequestIdx: number,
  recommendationIdx: number,
  client?: QueryClient,
): Promise<RouteRequestRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    prompt: string | null;
    element_conditions: RouteElementConditionsDTO | null;
    selected_recommendations_idx: number | null;
  }>(
    `
      UPDATE service.route_requests
      SET selected_recommendations_idx = $2
      WHERE idx = $1
        AND selected_recommendations_idx IS NULL
      RETURNING
        idx,
        users_idx,
        prompt,
        element_conditions,
        selected_recommendations_idx
    `,
    [routeRequestIdx, recommendationIdx],
  );

  const row = result.rows[0];

  return row ? mapRouteRequestRow(row) : null;
}

/**
 * 사용자가 소유한 경로 요청을 조회합니다.
 */
export async function findRouteRequestByIdxAndUserIdx(
  routeRequestIdx: number,
  userIdx: number,
  client?: QueryClient,
): Promise<RouteRequestRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    users_idx: number;
    prompt: string | null;
    element_conditions: RouteElementConditionsDTO | null;
    selected_recommendations_idx: number | null;
  }>(
    `
      SELECT
        idx,
        users_idx,
        prompt,
        element_conditions,
        selected_recommendations_idx
      FROM service.route_requests
      WHERE idx = $1
        AND users_idx = $2
      LIMIT 1
    `,
    [routeRequestIdx, userIdx],
  );

  const row = result.rows[0];

  return row ? mapRouteRequestRow(row) : null;
}
