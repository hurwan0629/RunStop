import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";
import type { UserRole } from "../types/user-context.js";

type QueryClient = Pool | PoolClient;

export type UserStatus = "ENABLED" | "SUSPENDED" | "WITHDRAWN";

export type AuthUserRow = {
  idx: number;
  role: UserRole;
  status: UserStatus;
  suspendedUntil: Date | null;
};

export type LoginUserRow = {
  idx: number;
  loginId: string;
  passwordHash: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  suspendedUntil: Date | null;
};

export type UserLookupRow = {
  idx: number;
  loginId: string;
  nickname: string;
  totalExp: number;
  role: UserRole;
  phone: string | null;
  status: UserStatus;
};

export type CreateUserInput = {
  loginId: string;
  passwordHash: string;
  nickname: string;
  phone: string;
  role?: UserRole;
};

export type CreatedUserRow = {
  idx: number;
  nickname: string;
  role: UserRole;
};

export type PasswordResetUserRow = {
  idx: number;
  loginId: string;
  phone: string | null;
  status: UserStatus;
};

export type UpdateUserInput = {
  nickname?: string;
};

export type WithdrawUserInput = {
  anonymizedLoginId: string;
  invalidPasswordHash: string;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

function mapAuthUserRow(row: {
  idx: number;
  role: UserRole;
  status: UserStatus;
  suspended_until: Date | null;
}): AuthUserRow {
  return {
    idx: row.idx,
    role: row.role,
    status: row.status,
    suspendedUntil: row.suspended_until,
  };
}

function mapLoginUserRow(row: {
  idx: number;
  login_id: string;
  password_hash: string;
  nickname: string;
  role: UserRole;
  status: UserStatus;
  suspended_until: Date | null;
}): LoginUserRow {
  return {
    idx: row.idx,
    loginId: row.login_id,
    passwordHash: row.password_hash,
    nickname: row.nickname,
    role: row.role,
    status: row.status,
    suspendedUntil: row.suspended_until,
  };
}

function mapUserLookupRow(row: {
  idx: number;
  login_id: string;
  nickname: string;
  total_exp: number;
  role: UserRole;
  phone: string | null;
  status: UserStatus;
}): UserLookupRow {
  return {
    idx: row.idx,
    loginId: row.login_id,
    nickname: row.nickname,
    totalExp: row.total_exp,
    role: row.role,
    phone: row.phone,
    status: row.status,
  };
}

/**
 * 로그인 아이디로 사용자를 조회합니다.
 */
export async function findUserByLoginId(loginId: string, client?: QueryClient): Promise<LoginUserRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    login_id: string;
    password_hash: string;
    nickname: string;
    role: UserRole;
    status: UserStatus;
    suspended_until: Date | null;
  }>(
    `
      SELECT
        idx,
        login_id,
        password_hash,
        nickname,
        role,
        status,
        suspended_until
      FROM service.users
      WHERE login_id = $1
      LIMIT 1
    `,
    [loginId],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapLoginUserRow(row);
}

/**
 * 전화번호로 사용자를 조회합니다.
 */
export async function findUserByPhone(phone: string, client?: QueryClient): Promise<UserLookupRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    login_id: string;
    nickname: string;
    total_exp: number;
    role: UserRole;
    phone: string;
    status: UserStatus;
  }>(
    `
      SELECT
        idx,
        login_id,
        nickname,
        total_exp,
        role,
        phone,
        status
      FROM service.users
      WHERE phone = $1
      LIMIT 1
    `,
    [phone],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapUserLookupRow(row);
}

/**
 * 기본 키로 사용자를 조회합니다.
 */
export async function findUserByIdx(idx: number, client?: QueryClient): Promise<UserLookupRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    login_id: string;
    nickname: string;
    total_exp: number;
    role: UserRole;
    phone: string;
    status: UserStatus;
  }>(
    `
      SELECT
        idx,
        login_id,
        nickname,
        total_exp,
        role,
        phone,
        status
      FROM service.users
      WHERE idx = $1
      LIMIT 1
    `,
    [idx],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapUserLookupRow(row);
}

/**
 * 로그인 아이디와 전화번호가 모두 일치하는 사용자를 조회합니다.
 */
export async function findUserByLoginIdAndPhone(
  loginId: string,
  phone: string,
  client?: QueryClient,
): Promise<PasswordResetUserRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    login_id: string;
    phone: string;
    status: UserStatus;
  }>(
    `
      SELECT
        idx,
        login_id,
        phone,
        status
      FROM service.users
      WHERE login_id = $1
        AND phone = $2
      LIMIT 1
    `,
    [loginId, phone],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    idx: row.idx,
    loginId: row.login_id,
    phone: row.phone,
    status: row.status,
  };
}

/**
 * 인증 미들웨어에서 사용할 사용자 상태와 권한 정보를 조회합니다.
 */
export async function findAuthUserByIdx(idx: number, client?: QueryClient): Promise<AuthUserRow | null> {
  const result = await getQueryClient(client).query<{
    idx: number;
    role: UserRole;
    status: UserStatus;
    suspended_until: Date | null;
  }>(
    `
      SELECT
        idx,
        role,
        status,
        suspended_until
      FROM service.users
      WHERE idx = $1
      LIMIT 1
    `,
    [idx],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapAuthUserRow(row);
}

/**
 * 새 정상 사용자 행을 추가합니다.
 */
export async function createUser(input: CreateUserInput, client?: QueryClient): Promise<CreatedUserRow> {
  const result = await getQueryClient(client).query<CreatedUserRow>(
    `
      INSERT INTO service.users (
        login_id,
        password_hash,
        nickname,
        phone,
        status,
        role
      )
      VALUES ($1, $2, $3, $4, 'ENABLED', $5)
      RETURNING
        idx,
        nickname,
        role
    `,
    [
      input.loginId,
      input.passwordHash,
      input.nickname,
      input.phone,
      input.role ?? "USER",
    ],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("사용자 생성 결과를 확인할 수 없습니다.");
  }

  return row;
}

/**
 * 사용자의 마지막 로그인 시각을 갱신합니다.
 */
export async function updateLastLoginAt(userIdx: number, client?: QueryClient): Promise<void> {
  await getQueryClient(client).query(
    `
      UPDATE service.users
      SET last_login_at = now()
      WHERE idx = $1
    `,
    [userIdx],
  );
}

/**
 * 기간 정지가 만료된 사용자를 정상 상태로 복구합니다.
 */
export async function restoreExpiredSuspension(userIdx: number, client?: QueryClient): Promise<void> {
  await getQueryClient(client).query(
    `
      UPDATE service.users
      SET
        status = 'ENABLED',
        suspended_until = NULL,
        updated_at = now()
      WHERE idx = $1
        AND status = 'SUSPENDED'
        AND suspended_until IS NOT NULL
        AND suspended_until <= now()
    `,
    [userIdx],
  );
}

/**
 * 사용자의 비밀번호 해시를 변경합니다.
 */
export async function updatePasswordHash(userIdx: number, passwordHash: string, client?: QueryClient): Promise<void> {
  await getQueryClient(client).query(
    `
      UPDATE service.users
      SET
        password_hash = $2,
        updated_at = now()
      WHERE idx = $1
    `,
    [userIdx, passwordHash],
  );
}

/**
 * 수정 가능한 사용자 계정 필드를 변경합니다.
 */
export async function updateUser(
  userIdx: number,
  input: UpdateUserInput,
  client?: QueryClient,
): Promise<UserLookupRow | null> {
  // 업데이트하고 RETURNING 해주기 / 없으면 null 반환해주기
  const result = await getQueryClient(client).query<{
    idx: number;
    login_id: string;
    nickname: string;
    total_exp: number;
    role: UserRole;
    phone: string | null;
    status: UserStatus;
  }>(
    `
      UPDATE service.users
      SET
        nickname = COALESCE($2, nickname),
        updated_at = now()
      WHERE idx = $1
        AND status <> 'WITHDRAWN'
      RETURNING
        idx,
        login_id,
        nickname,
        total_exp,
        role,
        phone,
        status
    `,
    [userIdx, input.nickname ?? null],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return mapUserLookupRow(row);
}

/**
 * 사용자를 탈퇴 상태로 변경하고 재사용 가능한 UNIQUE 필드를 익명화합니다.
 */
export async function withdrawUser(
  userIdx: number,
  input: WithdrawUserInput,
  client?: QueryClient,
): Promise<boolean> {
  const result = await getQueryClient(client).query(
    `
      UPDATE service.users
      SET
        status = 'WITHDRAWN',
        withdrawn_at = now(),
        updated_at = now(),
        login_id = $2,
        phone = NULL,
        password_hash = $3
      WHERE idx = $1
        AND status <> 'WITHDRAWN'
    `,
    [userIdx, input.anonymizedLoginId, input.invalidPasswordHash],
  );

  return (result.rowCount ?? 0) > 0;
}
