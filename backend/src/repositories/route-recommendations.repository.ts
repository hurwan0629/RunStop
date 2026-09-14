import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";
import type { RouteCoordinateDTO } from "../dto/route/route-coordinate.dto.js";
import type { WorkerRouteCandidateDTO } from "../dto/worker/worker-route-response.dto.js";
import type { RouteRequestDTO } from "../dto/route/route-request.dto.js";

type QueryClient = Pool | PoolClient;

export type RouteRecommendationRow = {
  // route_recommendation.idx
  idx: number;
  // 
  routeRequestIdx: number;
  name: string;
  score: number | null;
  featureScores: Record<string, number> | null;
  featureValues: Record<string, unknown> | null;
  totalDistance: number | null;
  totalAscent: number | null;
  slopeStd: number | null;
  path?: RouteCoordinateDTO[];
};

export type RouteRecommendationLookupRow = {
  idx: number;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function mapRecommendationRow(row: {
  idx: number;
  route_requests_idx: number;
  name: string;
  score: string | number | null;
  feature_scores: Record<string, number> | null;
  feature_values: Record<string, unknown> | null;
  total_distance: number | null;
  total_ascent: string | number | null;
  slope_std: string | number | null;
}): RouteRecommendationRow {
  return {
    idx: row.idx,
    routeRequestIdx: row.route_requests_idx,
    name: row.name,
    score: row.score === null ? null : Number(row.score),
    featureScores: row.feature_scores,
    featureValues: row.feature_values,
    totalDistance: row.total_distance,
    totalAscent: row.total_ascent === null ? null : Number(row.total_ascent),
    slopeStd: row.slope_std === null ? null : Number(row.slope_std),
  };
}

function makeLineStringWkt(path: RouteCoordinateDTO[]): string {
  const points = path.map((point) => `${point.lng} ${point.lat}`).join(", ");
  return `LINESTRING(${points})`;
}

function parseLineStringGeoJson(value: unknown): RouteCoordinateDTO[] {
  if (
    typeof value !== "object"
    || value === null
    || !("coordinates" in value)
    || !Array.isArray(value.coordinates)
  ) {
    return [];
  }

  return value.coordinates
    .filter((coordinate): coordinate is [number, number] => (
      Array.isArray(coordinate)
      && coordinate.length >= 2
      && typeof coordinate[0] === "number"
      && typeof coordinate[1] === "number"
    ))
    .map(([lng, lat]) => ({
      lat,
      lng,
    }));
}

/**
 * 워커가 생성한 경로 추천 후보를 추가합니다.
 */
export async function createRouteRecommendations(
  routeRequestIdx: number,  // 사용자가 요청한 데이터 idx
  candidates: WorkerRouteCandidateDTO[],  // 워커가 응답하는 정보
  client?: QueryClient,
): Promise<RouteRecommendationRow[]> {
  const created: RouteRecommendationRow[] = [];

  for (const candidate of candidates) {
    const result = await getQueryClient(client).query<{
      idx: number;
      route_requests_idx: number;
      name: string;
      score: string | null;
      feature_scores: Record<string, number> | null;
      feature_values: Record<string, unknown> | null;
      total_distance: number | null;
      total_ascent: string | null;
      slope_std: string | null;
    }>(
      `
        INSERT INTO service.route_recommendations (
          route_requests_idx,
          name,
          score,
          feature_scores,
          feature_values,
          total_distance,
          total_ascent,
          slope_std,
          route
        )
        VALUES (
          $1,
          $2,
          $3,
          $4::jsonb,
          $5::jsonb,
          $6,
          $7,
          $8,
          ST_SetSRID(ST_GeomFromText($9), 4326)
        )
        RETURNING
          idx,
          route_requests_idx,
          name,
          score,
          feature_scores,
          feature_values,
          total_distance,
          total_ascent,
          slope_std
      `,
      [
        routeRequestIdx,
        candidate.name,
        candidate.score,
        JSON.stringify(candidate.featureScores),
        JSON.stringify(candidate.featureValues),
        candidate.totalDistance,
        candidate.totalAscent,
        candidate.slopeStd,
        makeLineStringWkt(candidate.path),
      ],
    );

    const row = result.rows[0];

    if (!row) {
      throw new Error("경로 추천 후보 생성 결과를 확인할 수 없습니다.");
    }

    created.push(mapRecommendationRow(row));
  }

  return created;
}

/**
 * 기본 키로 경로 추천 후보를 조회합니다.
 */
export async function findRouteRecommendationByIdx(
  routeRecommendationIdx: number,
  client?: QueryClient,
): Promise<RouteRecommendationLookupRow | null> {
  const result = await getQueryClient(client).query<RouteRecommendationLookupRow>(
    `
      SELECT idx
      FROM service.route_recommendations
      WHERE idx = $1
      LIMIT 1
    `,
    [routeRecommendationIdx],
  );

  return result.rows[0] ?? null;
}

/**
 * 추천 후보가 특정 경로 요청에 속하는지 조회합니다.
 */
export async function findRouteRecommendationByIdxAndRequestIdx(
  recommendationIdx: number,
  routeRequestIdx: number,
  client?: QueryClient,
): Promise<RouteRecommendationRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    route_requests_idx: number;
    name: string;
    score: string | null;
    feature_scores: Record<string, number> | null;
    feature_values: Record<string, unknown> | null;
    total_distance: number | null;
    total_ascent: string | null;
    slope_std: string | null;
  }>(
    `
      SELECT
        idx,
        route_requests_idx,
        name,
        score,
        feature_scores,
        feature_values,
        total_distance,
        total_ascent,
        slope_std
      FROM service.route_recommendations
      WHERE idx = $1
        AND route_requests_idx = $2
      LIMIT 1
    `,
    [recommendationIdx, routeRequestIdx],
  );

  const row = result.rows[0];

  return row ? mapRecommendationRow(row) : null;
}

/**
 * 경로 요청에 속한 추천 후보 목록을 조회합니다.
 */
export async function findRouteRecommendationsByRequestIdx(
  routeRequestIdx: number,
  client?: QueryClient,
): Promise<RouteRecommendationRow[]> {
  const result = await getQueryClient(client).query<{
    idx: number;
    route_requests_idx: number;
    name: string;
    score: string | null;
    feature_scores: Record<string, number> | null;
    feature_values: Record<string, unknown> | null;
    total_distance: number | null;
    total_ascent: string | null;
    slope_std: string | null;
  }>(
    `
      SELECT
        idx,
        route_requests_idx,
        name,
        score,
        feature_scores,
        feature_values,
        total_distance,
        total_ascent,
        slope_std
      FROM service.route_recommendations
      WHERE route_requests_idx = $1
      ORDER BY score DESC NULLS LAST, idx ASC
    `,
    [routeRequestIdx],
  );

  return result.rows.map(mapRecommendationRow);
}

/**
 * API 출력용으로 공간 객체를 변환한 경로 상세 데이터를 조회합니다.
 */
export async function findRouteDetailByIdx(
  routeRecommendationIdx: number,
  client?: QueryClient,
): Promise<RouteRecommendationRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    route_requests_idx: number;
    name: string;
    score: string | null;
    feature_scores: Record<string, number> | null;
    feature_values: Record<string, unknown> | null;
    total_distance: number | null;
    total_ascent: string | null;
    slope_std: string | null;
    route_geojson: unknown;
  }>(
    `
      SELECT
        idx,
        route_requests_idx,
        name,
        score,
        feature_scores,
        feature_values,
        total_distance,
        total_ascent,
        slope_std,
        ST_AsGeoJSON(route)::json AS route_geojson
      FROM service.route_recommendations
      WHERE idx = $1
      LIMIT 1
    `,
    [routeRecommendationIdx],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    ...mapRecommendationRow(row),
    path: parseLineStringGeoJson(row.route_geojson),
  };
}

export type RouteRecommendationEndContext = {
  routeType: RouteRequestDTO["routeType"] | null;
  totalDistance: number | null;
  destination: RouteCoordinateDTO;
};

export async function findRouteRecommendationEndContext(
  routeRecommendationIdx: number,
  client?: QueryClient,
): Promise<RouteRecommendationEndContext | null> {
  const result = await getQueryClient(client).query<{
    route_type: RouteRequestDTO["routeType"] | null;
    total_distance: number | null;
    destination_lat: number | null;
    destination_lng: number | null;
  }>(
    `
      SELECT
        requests.route_type,
        recommendations.total_distance,
        ST_Y(ST_EndPoint(recommendations.route))::float8 AS destination_lat,
        ST_X(ST_EndPoint(recommendations.route))::float8 AS destination_lng
      FROM service.route_recommendations AS recommendations
      INNER JOIN service.route_requests AS requests
        ON requests.idx = recommendations.route_requests_idx
      WHERE recommendations.idx = $1
      LIMIT 1
    `,
    [routeRecommendationIdx],
  );

  const row = result.rows[0];

  if (
    !row
    || row.destination_lat === null
    || row.destination_lng === null
  ) {
    return null;
  }

  return {
    routeType: row.route_type,
    totalDistance: row.total_distance,
    destination: {
      lat: row.destination_lat,
      lng: row.destination_lng,
    },
  };
}