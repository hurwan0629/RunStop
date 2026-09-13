import { withTransaction } from "../infra/db/transaction.js";

import type {
  AdminSuspensionDTO,
} from "../dto/admin/admin.dto.js";

import type {
  AdminUserStatus,
} from "../dto/admin/admin-user-list.dto.js";

import type {
  AdminUserStatusUpdateInput,
} from "../dto/admin/admin-user-status.dto.js";

import { getPool } from "../infra/db/pool.js";

export type AdminUserListRow = {
  userIdx: number;
  loginId: string;
  nickname: string;
  phone: string | null;
  status: AdminUserStatus;
  joinedAt: Date;
  lastLoginAt: Date | null;
};

export type FindAdminUsersInput = {
  page: number;
  limit: number;
  keyword?: string | undefined;
  status?: AdminUserStatus | undefined;
};

export type AdminUserSummaryRow = {
  total: number;
  enabled: number;
  suspended: number;
  withdrawn: number;
};

/**
 * 관리자용 회원 목록을 조회합니다.
 */
export async function findAdminUsers(
  input: FindAdminUsersInput,
): Promise<AdminUserListRow[]> {
  const offset = (input.page - 1) * input.limit;

  const result = await getPool().query<{
    idx: number;
    login_id: string;
    nickname: string;
    phone: string | null;
    status: AdminUserStatus;
    created_at: Date;
    last_login_at: Date | null;
  }>(
    `
      SELECT
        idx,
        login_id,
        nickname,
        phone,
        status,
        created_at,
        last_login_at
      FROM service.users
      WHERE role = 'USER'
        AND (
          $1::text IS NULL
          OR login_id ILIKE '%' || $1 || '%'
          OR nickname ILIKE '%' || $1 || '%'
          OR phone ILIKE '%' || $1 || '%'
        )
        AND (
          $2::service.user_status IS NULL
          OR status = $2
        )
      ORDER BY created_at DESC, idx DESC
      LIMIT $3
      OFFSET $4
    `,
    [
      input.keyword || null,
      input.status ?? null,
      input.limit,
      offset,
    ],
  );

  return result.rows.map((row) => ({
    userIdx: row.idx,
    loginId: row.login_id,
    nickname: row.nickname,
    phone: row.phone,
    status: row.status,
    joinedAt: row.created_at,
    lastLoginAt: row.last_login_at,
  }));
}

/**
 * 검색·필터 조건에 해당하는 전체 회원 수를 조회합니다.
 */
export async function countFilteredAdminUsers(
  input: Pick<
    FindAdminUsersInput,
    "keyword" | "status"
  >,
): Promise<number> {
  const result = await getPool().query<{
    count: string;
  }>(
    `
      SELECT COUNT(*)::text AS count
      FROM service.users
      WHERE role = 'USER'
        AND (
          $1::text IS NULL
          OR login_id ILIKE '%' || $1 || '%'
          OR nickname ILIKE '%' || $1 || '%'
          OR phone ILIKE '%' || $1 || '%'
        )
        AND (
          $2::service.user_status IS NULL
          OR status = $2
        )
    `,
    [
      input.keyword || null,
      input.status ?? null,
    ],
  );

  return Number(result.rows[0]?.count ?? 0);
}

/**
 * 전체·정상·정지·탈퇴 회원 수를 조회합니다.
 */
export async function summarizeAdminUsers(): Promise<AdminUserSummaryRow> {
  const result = await getPool().query<{
    total: string;
    enabled: string;
    suspended: string;
    withdrawn: string;
  }>(
    `
      SELECT
        COUNT(*)::text AS total,

        COUNT(*) FILTER (
          WHERE status = 'ENABLED'
        )::text AS enabled,

        COUNT(*) FILTER (
          WHERE status = 'SUSPENDED'
        )::text AS suspended,

        COUNT(*) FILTER (
          WHERE status = 'WITHDRAWN'
        )::text AS withdrawn

      FROM service.users
      WHERE role = 'USER'
    `,
  );

  const row = result.rows[0];

  return {
    total: Number(row?.total ?? 0),
    enabled: Number(row?.enabled ?? 0),
    suspended: Number(row?.suspended ?? 0),
    withdrawn: Number(row?.withdrawn ?? 0),
  };
}

/**
 * 기존 이용 정지 API용 함수입니다.
 */
export async function suspendUser(
  input: AdminSuspensionDTO,
) {
  return withTransaction(async (client) => {
    const target = await client.query<{
      status: string;
    }>(
      `
        SELECT status
        FROM service.users
        WHERE idx = $1
        FOR UPDATE
      `,
      [input.userIdx],
    );

    if (!target.rows[0]) {
      return { kind: "not_found" as const };
    }

    if (target.rows[0].status === "WITHDRAWN") {
      return { kind: "withdrawn" as const };
    }

    const result = await client.query<{
      idx: number;
      status: "SUSPENDED";
      suspended_until: Date | null;
    }>(
      `
        UPDATE service.users
        SET
          status = 'SUSPENDED',
          suspended_until = $2::timestamptz,
          admin_memo = concat_ws(
            E'\\n',
            NULLIF(admin_memo, ''),
            '[' || to_char(
              clock_timestamp() AT TIME ZONE 'Asia/Seoul',
              'YYYY-MM-DD HH24:MI:SS'
            ) || ' KST] 정지 사유: ' || $3::text
          ),
          updated_at = now()
        WHERE idx = $1
        RETURNING idx, status, suspended_until
      `,
      [
        input.userIdx,
        input.suspendedUntil,
        input.reason,
      ],
    );

    const user = result.rows[0]!;

    return {
      kind: "success" as const,
      data: {
        userIdx: user.idx,
        status: user.status,
        suspendedUntil:
          user.suspended_until?.toISOString() ?? null,
      },
    };
  });
}

export type AdminUserDetailRow = {
  userIdx: number;
  loginId: string;
  nickname: string;
  phone: string | null;
  status: AdminUserStatus;
  totalExp: number;
  joinedAt: Date;
  lastLoginAt: Date | null;
  suspendedUntil: Date | null;
  adminMemo: string | null;
};

export type AdminUserRunningSummaryRow = {
  completedRunCount: number;
  totalDistanceMeter: number;
};

export type AdminUserRecentInquiryRow = {
  inquiryIdx: number;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "ANSWERED";
  createdAt: Date;
};

/**
 * 관리자용 회원 기본 상세 정보를 조회합니다.
 */
export async function findAdminUserDetail(
  userIdx: number,
): Promise<AdminUserDetailRow | null> {
  const result = await getPool().query<{
    idx: number;
    login_id: string;
    nickname: string;
    phone: string | null;
    status: AdminUserStatus;
    total_exp: number;
    created_at: Date;
    last_login_at: Date | null;
    suspended_until: Date | null;
    admin_memo: string | null;
  }>(
    `
      SELECT
        idx,
        login_id,
        nickname,
        phone,
        status,
        total_exp,
        created_at,
        last_login_at,
        suspended_until,
        admin_memo
      FROM service.users
      WHERE idx = $1
        AND role = 'USER'
      LIMIT 1
    `,
    [userIdx],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    userIdx: row.idx,
    loginId: row.login_id,
    nickname: row.nickname,
    phone: row.phone,
    status: row.status,
    totalExp: row.total_exp,
    joinedAt: row.created_at,
    lastLoginAt: row.last_login_at,
    suspendedUntil: row.suspended_until,
    adminMemo: row.admin_memo,
  };
}

/**
 * 완료된 러닝 횟수와 총 거리를 조회합니다.
 */
export async function findAdminUserRunningSummary(
  userIdx: number,
): Promise<AdminUserRunningSummaryRow> {
  const result = await getPool().query<{
    completed_run_count: number;
    total_distance_meter: number;
  }>(
    `
      SELECT
        COUNT(*)::integer AS completed_run_count,

        COALESCE(
          SUM(distance),
          0
        )::integer AS total_distance_meter

      FROM service.running_sessions
      WHERE users_idx = $1
        AND status = 'COMPLETED'
    `,
    [userIdx],
  );

  const row = result.rows[0];

  return {
    completedRunCount:
      row?.completed_run_count ?? 0,

    totalDistanceMeter:
      row?.total_distance_meter ?? 0,
  };
}

/**
 * 회원이 최근에 작성한 문의 5건을 조회합니다.
 */
export async function findRecentInquiriesByUserIdx(
  userIdx: number,
): Promise<AdminUserRecentInquiryRow[]> {
  const result = await getPool().query<{
    idx: number;
    title: string;
    status: "PENDING" | "IN_PROGRESS" | "ANSWERED";
    created_at: Date;
  }>(
    `
      SELECT
        idx,
        title,
        status,
        created_at
      FROM service.inquiries
      WHERE users_idx = $1
      ORDER BY created_at DESC, idx DESC
      LIMIT 5
    `,
    [userIdx],
  );

  return result.rows.map((row) => ({
    inquiryIdx: row.idx,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * 회원 상태를 이용 정지 또는 정상으로 변경합니다.
 */
export async function updateAdminUserStatus(
  userIdx: number,
  input: AdminUserStatusUpdateInput,
) {
  return withTransaction(async (client) => {
    const targetResult = await client.query<{
      idx: number;
      role: "USER" | "ADMIN";
      status: AdminUserStatus;
    }>(
      `
        SELECT idx, role, status
        FROM service.users
        WHERE idx = $1
        FOR UPDATE
      `,
      [userIdx],
    );

    const target = targetResult.rows[0];

    if (!target || target.role !== "USER") {
      return { type: "NOT_FOUND" as const };
    }

    if (target.status === "WITHDRAWN") {
      return { type: "WITHDRAWN" as const };
    }

    if (
      input.status === "ENABLED" &&
      target.status !== "SUSPENDED"
    ) {
      return {
        type: "INVALID_TRANSITION" as const,
      };
    }

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour12: false,
    });

    const memo =
      input.status === "SUSPENDED"
        ? `[${now}] 이용 정지 사유: ${input.reason}`
        : `[${now}] 이용 정지 해제 사유: ${input.reason}`;

    const result =
      input.status === "SUSPENDED"
        ? await client.query<{
            userIdx: number;
            status: AdminUserStatus;
            suspendedUntil: Date | null;
          }>(
            `
              UPDATE service.users
              SET
                status = 'SUSPENDED',
                suspended_until = $2::timestamptz,
                admin_memo = CONCAT_WS(
                  E'\\n',
                  NULLIF(admin_memo, ''),
                  $3::text
                ),
                updated_at = NOW()
              WHERE idx = $1
              RETURNING
                idx AS "userIdx",
                status,
                suspended_until AS "suspendedUntil"
            `,
            [
              userIdx,
              input.suspendedUntil,
              memo,
            ],
          )
        : await client.query<{
            userIdx: number;
            status: AdminUserStatus;
            suspendedUntil: Date | null;
          }>(
            `
              UPDATE service.users
              SET
                status = 'ENABLED',
                suspended_until = NULL,
                admin_memo = CONCAT_WS(
                  E'\\n',
                  NULLIF(admin_memo, ''),
                  $2::text
                ),
                updated_at = NOW()
              WHERE idx = $1
              RETURNING
                idx AS "userIdx",
                status,
                suspended_until AS "suspendedUntil"
            `,
            [
              userIdx,
              memo,
            ],
          );

    return {
      type: "UPDATED" as const,
      data: result.rows[0],
    };
  });
}

export type AdminDashboardSummaryRow = {
  totalUsers: number;
  todayJoinedUsers: number;
  pendingInquiries: number;
  todayAnsweredInquiries: number;
};

export type AdminDashboardRecentInquiryRow = {
  inquiryIdx: number;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "ANSWERED";
  createdAt: Date;
  authorNickname: string;
  answererNickname: string | null;
};

/**
 * 관리자 대시보드 상단 카드 4개의 집계값을 조회합니다.
 */
export async function findAdminDashboardSummary(): Promise<AdminDashboardSummaryRow> {
  const result = await getPool().query<{
    total_users: number;
    today_joined_users: number;
    pending_inquiries: number;
    today_answered_inquiries: number;
  }>(
    `
      SELECT
        (
          SELECT COUNT(*)::integer
          FROM service.users
          WHERE role = 'USER'
        ) AS total_users,

        (
          SELECT COUNT(*)::integer
          FROM service.users
          WHERE role = 'USER'
            AND (
              created_at AT TIME ZONE 'Asia/Seoul'
            )::date = (
              now() AT TIME ZONE 'Asia/Seoul'
            )::date
        ) AS today_joined_users,

        (
          SELECT COUNT(*)::integer
          FROM service.inquiries
          WHERE status = 'PENDING'
        ) AS pending_inquiries,

        (
          SELECT COUNT(*)::integer
          FROM service.inquiries
          WHERE status = 'ANSWERED'
            AND answered_at IS NOT NULL
            AND (
              answered_at AT TIME ZONE 'Asia/Seoul'
            )::date = (
              now() AT TIME ZONE 'Asia/Seoul'
            )::date
        ) AS today_answered_inquiries
    `,
  );

  const row = result.rows[0];

  return {
    totalUsers: row?.total_users ?? 0,
    todayJoinedUsers: row?.today_joined_users ?? 0,
    pendingInquiries: row?.pending_inquiries ?? 0,
    todayAnsweredInquiries:
      row?.today_answered_inquiries ?? 0,
  };
}

/**
 * 관리자 대시보드에 표시할 최근 문의 5건을 조회합니다.
 */
export async function findAdminDashboardRecentInquiries(): Promise<
  AdminDashboardRecentInquiryRow[]
> {
  const result = await getPool().query<{
    inquiry_idx: number;
    title: string;
    status: "PENDING" | "IN_PROGRESS" | "ANSWERED";
    created_at: Date;
    author_nickname: string;
    answerer_nickname: string | null;
  }>(
    `
      SELECT
        i.idx AS inquiry_idx,
        i.title,
        i.status,
        i.created_at,
        author.nickname AS author_nickname,
        answerer.nickname AS answerer_nickname
      FROM service.inquiries i
      INNER JOIN service.users author
        ON author.idx = i.users_idx
      LEFT JOIN service.users answerer
        ON answerer.idx = i.answerer_idx
      ORDER BY i.created_at DESC, i.idx DESC
      LIMIT 5
    `,
  );

  return result.rows.map((row) => ({
    inquiryIdx: row.inquiry_idx,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    authorNickname: row.author_nickname,
    answererNickname: row.answerer_nickname,
  }));
}