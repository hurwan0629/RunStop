import { getPool } from "../infra/db/pool.js";

export type ExplorerQuery = {
  page: number; userIdx?: number | undefined; from?: string | undefined;
  to?: string | undefined; keyword?: string | undefined; routeType?: string | undefined;
  selection?: string | undefined;
  routeIdx?: number | undefined;
};

// 운영 화면의 탐색 전용 조회. 추천 생성·선택·러닝 저장에는 관여하지 않는다.
export async function findExplorerRequests(query: ExplorerQuery) {
  const result = await getPool().query(`
    SELECT q.idx, q.users_idx AS "userIdx", u.nickname, q.created_at AS "createdAt",
      q.route_type AS "routeType", q.element_conditions AS "elementConditions",
      q.selected_recommendations_idx AS "selectedRecommendationIdx",
      (SELECT COUNT(*)::integer FROM service.route_recommendations r
        WHERE r.route_requests_idx = q.idx) AS "candidateCount"
    FROM service.route_requests q JOIN service.users u ON u.idx = q.users_idx
    WHERE ($1::integer IS NULL OR q.users_idx = $1)
      AND ($2::date IS NULL OR q.created_at >= ($2::date::timestamp AT TIME ZONE 'Asia/Seoul'))
      AND ($3::date IS NULL OR q.created_at < (($3::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'))
      AND ($4::text IS NULL OR u.nickname ILIKE '%' || $4 || '%'
        OR ('REQ-' || q.idx::text) ILIKE '%' || $4 || '%')
      AND ($5::text IS NULL OR q.route_type::text = $5)
      AND ($6::text IS NULL OR ($6 = 'SELECTED' AND q.selected_recommendations_idx IS NOT NULL)
        OR ($6 = 'UNSELECTED' AND q.selected_recommendations_idx IS NULL))
    ORDER BY q.created_at DESC, q.idx DESC LIMIT 21 OFFSET $7
  `, [query.userIdx ?? null, query.from ?? null, query.to ?? null, query.keyword || null,
    query.routeType || null, query.selection || null, (query.page - 1) * 20]);
  return { items: result.rows.slice(0, 20), hasMore: result.rows.length > 20, page: query.page };
}

export async function findExplorerRequestHeader(requestIdx: number) {
  const result = await getPool().query(`
    SELECT q.idx, q.users_idx AS "userIdx", u.nickname, q.created_at AS "createdAt"
    FROM service.route_requests q JOIN service.users u ON u.idx = q.users_idx WHERE q.idx = $1
  `, [requestIdx]);
  return result.rows[0] ?? null;
}

export async function findExplorerRuns(query: ExplorerQuery, requestIdx?: number) {
  const result = await getPool().query(`
    SELECT s.idx AS "sessionIdx", s.users_idx AS "userIdx", u.nickname, s.status,
      s.started_at AS "startedAt", s.finished_at AS "finishedAt", s.distance,
      s.average_pace AS "averagePace", r.name AS "routeName",
      r.idx AS "routeIdx", r.route_requests_idx AS "requestIdx"
    FROM service.running_sessions s JOIN service.users u ON u.idx = s.users_idx
    LEFT JOIN service.route_recommendations r ON r.idx = s.route_recommendations_idx
    WHERE ($1::integer IS NULL OR s.users_idx = $1)
      AND ($2::date IS NULL OR s.started_at >= ($2::date::timestamp AT TIME ZONE 'Asia/Seoul'))
      AND ($3::date IS NULL OR s.started_at < (($3::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'))
      AND ($4::integer IS NULL OR r.route_requests_idx = $4)
      AND ($6::integer IS NULL OR r.idx = $6)
    ORDER BY s.started_at DESC, s.idx DESC LIMIT 21 OFFSET $5
  `, [query.userIdx ?? null, query.from ?? null, query.to ?? null, requestIdx ?? null, (query.page - 1) * 20, query.routeIdx ?? null]);
  return { items: result.rows.slice(0, 20), hasMore: result.rows.length > 20, page: query.page };
}

export async function findExplorerUserSummary(userIdx: number) {
  const result = await getPool().query(`
    SELECT (SELECT COUNT(*)::integer FROM service.route_requests WHERE users_idx = $1) AS "requestCount",
      (SELECT MAX(started_at) FROM service.running_sessions WHERE users_idx = $1) AS "lastRunAt"
  `, [userIdx]);
  return result.rows[0];
}
