import type { Pool, PoolClient } from "pg";
import { getPool } from "../infra/db/pool.js";

type QueryClient = Pool | PoolClient;

export type CreateUserProfileInput = {
  userIdx: number;
  weightKg?: number;
  heightCm?: number;
  runningSettings?: Record<string, unknown>;
  profileImageUrl?: string;
};

function getQueryClient(client?: QueryClient): QueryClient {
  return client ?? getPool();
}

/**
 * 사용자의 프로필 행을 조회합니다.
 */
export async function findProfileByUserIdx() {
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
        running_settings,
        profile_image_url
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
    [
      input.userIdx,
      input.weightKg ?? null,
      input.heightCm ?? null,
      input.runningSettings ?? null,
      input.profileImageUrl ?? null,
    ],
  );
}

/**
 * 사용자의 수정 가능한 프로필 값을 변경합니다.
 */
export async function updateUserProfile() {
}
