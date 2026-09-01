import type { PoolClient } from "pg";
import { getPool } from "./pool.js";

/**
 * 여러 저장소 작업을 하나의 데이터베이스 트랜잭션 안에서 실행합니다.
 */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const result = await work(client);

    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
