import { getPool } from "../infra/db/pool.js";

export type RunningQuery = { from: string; to: string; page: number; userIdx?: number | undefined };

export async function findAdminRuns(query: RunningQuery) {
  const result = await getPool().query(`
    SELECT s.idx AS "sessionIdx", s.users_idx AS "userIdx", u.nickname,
      s.status, s.started_at AS "startedAt", s.finished_at AS "finishedAt",
      s.distance, s.average_pace AS "averagePace", r.name AS "routeName"
    FROM service.running_sessions s
    JOIN service.users u ON u.idx = s.users_idx
    LEFT JOIN service.route_recommendations r ON r.idx = s.route_recommendations_idx
    WHERE s.started_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Seoul')
      AND s.started_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')
      AND ($3::integer IS NULL OR s.users_idx = $3)
    ORDER BY s.started_at DESC, s.idx DESC LIMIT 21 OFFSET $4
  `, [query.from, query.to, query.userIdx ?? null, (query.page - 1) * 20]);
  return { items: result.rows.slice(0, 20), hasMore: result.rows.length > 20, page: query.page };
}

export async function findSessionOwner(sessionIdx: number): Promise<number | null> {
  const result = await getPool().query("SELECT users_idx FROM service.running_sessions WHERE idx = $1", [sessionIdx]);
  return result.rows[0]?.users_idx ?? null;
}

/** 기간 집계는 DB에서 한 번에 수행한다. 실패 요청은 저장되지 않아 집계하지 않는다. */
export async function findRunningAnalytics(from: string, to: string) {
  const result = await getPool().query(`
    WITH days AS (
      SELECT generate_series($1::date::timestamp, $2::date::timestamp, interval '1 day')::date AS day
    ), runs AS (
      SELECT (started_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        COUNT(*)::integer AS runs,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::integer AS completed,
        COALESCE(SUM(distance) FILTER (WHERE status = 'COMPLETED'), 0)::float8 AS distance
      FROM service.running_sessions
      WHERE started_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Seoul')
        AND started_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')
      GROUP BY 1
    ), requests AS (
      SELECT (created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        COUNT(*)::integer AS requests,
        COUNT(selected_recommendations_idx)::integer AS selected
      FROM service.route_requests
      WHERE created_at >= ($1::date::timestamp AT TIME ZONE 'Asia/Seoul')
        AND created_at < (($2::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')
      GROUP BY 1
    )
    SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
      COALESCE(r.runs, 0) AS runs, COALESCE(r.completed, 0) AS completed,
      COALESCE(r.distance, 0) AS distance, COALESCE(q.requests, 0) AS requests,
      COALESCE(q.selected, 0) AS selected
    FROM days d LEFT JOIN runs r USING(day) LEFT JOIN requests q USING(day)
    ORDER BY d.day
  `, [from, to]);
  return result.rows;
}
