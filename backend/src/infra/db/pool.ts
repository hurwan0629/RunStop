import { Pool } from "pg";
import { env } from "../../config/env.js";

let pool: Pool | undefined;

/**
 * 저장소 계층에서 사용할 PostgreSQL 연결 풀을 생성합니다.
 */
export function createPool(): Pool {
  return new Pool({
    connectionString: env.DATABASE_URL,
  });
}

/**
 * 공유 PostgreSQL 연결 풀을 반환합니다.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = createPool();
  }

  return pool;
}

/**
 * 서버 종료 시 공유 PostgreSQL 연결 풀을 닫습니다.
 */
export async function closePool(): Promise<void> {
  if (!pool) {
    return;
  }

  await pool.end();
  pool = undefined;
}
