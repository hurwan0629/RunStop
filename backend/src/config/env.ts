import "dotenv/config";
import { z } from "zod";

/**
 * 서버 실행에 필요한 환경변수 형식을 정의합니다.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(3000),

  JWT_SECRET: z
    .string()
    .min(32),

  BCRYPT_SALT_ROUNDS: z
    .coerce
    .number()
    .int()
    .min(10)
    .max(15)
    .default(12),

  SMS_API_ENABLED: z
    .preprocess((value) => value === "true" || value === true, z.boolean())
    .default(false),

  DATABASE_URL: z
    .string()
    .min(1),

  // 2026-09-01 17:22:23 시점에는 fastapi 를 사용중입니다. 기존에 Worker 방식을 사용할 예정에서 변경되었기 때문에 이러한 형태입니다.
  WORKER_URL: z
    .string()
    .url(),
});

/**
 * 검증이 끝난 서버 환경변수 객체입니다.
 */
export const env = envSchema.parse(process.env);
