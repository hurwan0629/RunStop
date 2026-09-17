import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type UserProfileRow = {
  weightKg: number | null;
  heightCm: number | null;
  runningSettings: Record<string, unknown> | null;
  profileImageUrl: string | null;
};

export type CreateUserProfileInput = {
  userIdx: number;
  weightKg?: number;
  heightCm?: number;
  runningSettings?: Record<string, unknown>;
  profileImageUrl?: string;
};

export type UpdateUserProfileInput = {
  weightKg?: number;
  heightCm?: number;
  runningSettings?: Record<string, unknown>;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

/**
 * 사용자의 프로필 행을 조회합니다.
 */
export async function findProfileByUserIdx(userIdx: number, client?: QueryClient): Promise<UserProfileRow | null> {
  const result = await getQueryClient(client).query<{
    weight: string | number | null;
    height: string | number | null;
    running_settings: Record<string, unknown> | null;
  }>(
    `
      SELECT
        weight,
        height,
        running_settings
      FROM service.user_profiles
      WHERE users_idx = $1
      LIMIT 1
    `,
    [userIdx],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    weightKg: row.weight === null ? null : Number(row.weight),
    heightCm: row.height === null ? null : Number(row.height),
    runningSettings: row.running_settings,
    profileImageUrl: null,
  };
}

/**
 * 사용자의 초기 프로필 행을 생성합니다.
 */
export async function createUserProfile(input: CreateUserProfileInput, client?: QueryClient): Promise<void> {
  await getQueryClient(client).query(
    `
      INSERT INTO service.user_profiles (
        users_idx,
        weight,
        height,
        running_settings
      )
      VALUES ($1, $2, $3, $4)
    `,
    [
      input.userIdx,
      input.weightKg ?? null,
      input.heightCm ?? null,
      input.runningSettings ?? null,
    ],
  );
}

/**
 * 사용자의 수정 가능한 프로필 값을 변경합니다.
 */
export async function updateUserProfile(
  userIdx: number,
  input: UpdateUserProfileInput,
  client?: QueryClient,
): Promise<UserProfileRow | null> {
  const result = await getQueryClient(client).query<{
    weight: string | number | null;
    height: string | number | null;
    running_settings: Record<string, unknown> | null;
  }>(
    `
      UPDATE service.user_profiles
      SET
        weight = COALESCE($2, weight),
        height = COALESCE($3, height),
        running_settings = COALESCE($4, running_settings)
      WHERE users_idx = $1
      RETURNING
        weight,
        height,
        running_settings
    `,
    [
      userIdx,
      input.weightKg ?? null,
      input.heightCm ?? null,
      input.runningSettings ?? null,
    ],
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  return {
    weightKg: row.weight === null ? null : Number(row.weight),
    heightCm: row.height === null ? null : Number(row.height),
    runningSettings: row.running_settings,
    profileImageUrl: null,
  };
}
