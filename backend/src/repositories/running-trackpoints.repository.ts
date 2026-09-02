import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type RunningTrackpointRow = {
  idx: number;
  clientTrackpointId: string;
  sessionIdx: number;
  lat: number;
  lng: number;
  recordedAt: Date;
  accuracy: number | null;
};

export type RunningTrackpointStatsRow = {
  trackpointCount: number;
  distance: number;
};

export type RunningTrackpointProjectedRow = {
  idx: number;
  x: number;
  y: number;
  recordedAt: Date;
};

export type CreateRunningTrackpointInput = {
  clientTrackpointId: string;
  lat: number;
  lng: number;
  recordedAt: string;
  accuracy?: number | undefined;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function mapTrackpointRow(row: {
  idx: number;
  client_trackpoint_id: string;
  running_sessions_idx: number;
  lat: number | string;
  lng: number | string;
  recorded_at: Date;
  accuracy: number | string | null;
}): RunningTrackpointRow {
  return {
    idx: row.idx,
    clientTrackpointId: row.client_trackpoint_id,
    sessionIdx: row.running_sessions_idx,
    lat: Number(row.lat),
    lng: Number(row.lng),
    recordedAt: row.recorded_at,
    accuracy: row.accuracy === null ? null : Number(row.accuracy),
  };
}

/**
 * 러닝 세션의 GPS 트랙포인트를 추가합니다. - 저장된 데이터 숫자를 반환합니다.
 */
export async function createRunningTrackpoints(
  sessionIdx: number,
  trackpoints: CreateRunningTrackpointInput[], // 5개 데이터 들어있는 것 (시간, 위경도, 정확도, client-id)
  client?: QueryClient,
): Promise<number> {
  // 넣을 값이 없으면 0 반환
  if (trackpoints.length === 0) {
    return 0;
  }

  const values: unknown[] = [];
  const placeholders = trackpoints.map((trackpoint, index) => {
    const base = index * 6;

    values.push(
      trackpoint.clientTrackpointId,
      sessionIdx,
      trackpoint.lng,
      trackpoint.lat,
      trackpoint.recordedAt,
      trackpoint.accuracy ?? null,
    );
    // ::uuid, ::timestamptz를 이용해서 프론트에서 보낸 clientid와 recordedAt를 절대적으로 저장할 수 있게 하며 EPSG(SRID) 4326 방식 위경도로 저장
    return `($${base + 1}::uuid, $${base + 2}, ST_SetSRID(ST_MakePoint($${base + 3}, $${base + 4}), 4326), $${base + 5}::timestamptz, $${base + 6})`;
  });

  // 데이터 안에 그대로 저장하기
  const result = await getQueryClient(client).query(
    `
      INSERT INTO service.running_trackpoints (
        client_trackpoint_id,
        running_sessions_idx,
        point,
        recorded_at,
        accuracy
      )
      VALUES ${placeholders.join(", ")}
      ON CONFLICT (client_trackpoint_id) DO NOTHING
    `,
    values,
  );

  return result.rowCount ?? 0;
}

/**
 * 러닝 세션의 트랙포인트를 시간순으로 조회합니다.
 */
export async function findTrackpointsBySessionIdx(
  sessionIdx: number,
  client?: QueryClient,
): Promise<RunningTrackpointRow[]> {
  // 
  const result = await getQueryClient(client).query<{
    idx: number;
    client_trackpoint_id: string;
    running_sessions_idx: number;
    lat: string;
    lng: string;
    recorded_at: Date;
    accuracy: string | null;
  }>(
    `
      SELECT
        idx,
        client_trackpoint_id,
        running_sessions_idx,
        ST_Y(point::geometry) AS lat,
        ST_X(point::geometry) AS lng,
        recorded_at,
        accuracy
      FROM service.running_trackpoints
      WHERE running_sessions_idx = $1
      ORDER BY recorded_at ASC, idx ASC
    `,
    [sessionIdx],
  );

  return result.rows.map(mapTrackpointRow);
}

/**
 * 품질 조건을 통과한 트랙포인트를 5179 좌표계로 변환해 러닝 거리 통계를 계산합니다.
 */
export async function calculateRunningTrackpointStats(
  sessionIdx: number,
  client?: QueryClient,
): Promise<RunningTrackpointStatsRow> {
  const result = await getQueryClient(client).query<{
    trackpoint_count: number;
    distance: number | null;
  }>(
    `
      WITH filtered_trackpoints AS (
        SELECT
          idx,
          point,
          recorded_at
        FROM service.running_trackpoints
        WHERE running_sessions_idx = $1
          AND (accuracy IS NULL OR accuracy <= 50)
      )
      SELECT
        COUNT(*)::integer AS trackpoint_count,
        CASE
          WHEN COUNT(*) < 2 THEN 0
          ELSE ROUND(
            ST_Length(
              ST_Transform(
                ST_MakeLine(point ORDER BY recorded_at ASC, idx ASC),
                5179
              )
            )
          )::integer
        END AS distance
      FROM filtered_trackpoints
    `,
    [sessionIdx],
  );

  const row = result.rows[0];

  return {
    trackpointCount: row?.trackpoint_count ?? 0,
    distance: row?.distance ?? 0,
  };
}

/**
 * 페이스 구간 계산을 위해 유효 트랙포인트를 5179 좌표계 x/y로 조회합니다.
 */
export async function findProjectedTrackpointsBySessionIdx(
  sessionIdx: number,
  client?: QueryClient,
): Promise<RunningTrackpointProjectedRow[]> {
  const result = await getQueryClient(client).query<{
    idx: number;
    x: string;
    y: string;
    recorded_at: Date;
  }>(
    `
      SELECT
        idx,
        ST_X(ST_Transform(point, 5179)) AS x,
        ST_Y(ST_Transform(point, 5179)) AS y,
        recorded_at
      FROM service.running_trackpoints
      WHERE running_sessions_idx = $1
        AND (accuracy IS NULL OR accuracy <= 50)
      ORDER BY recorded_at ASC, idx ASC
    `,
    [sessionIdx],
  );

  return result.rows.map((row) => ({
    idx: row.idx,
    x: Number(row.x),
    y: Number(row.y),
    recordedAt: row.recorded_at,
  }));
}
