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

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

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

  SOLAPI_API_KEY: z.string().min(1).optional(),

  SOLAPI_API_SECRET: z.string().min(1).optional(),

  SOLAPI_FROM_NUMBER: z.string().min(1).optional(),

  NAVER_API_HUB_CLIENT_ID: z.string().min(1).optional(),

  NAVER_API_HUB_CLIENT_SECRET: z.string().min(1).optional(),

  LLM_MODE: z
    .enum(["mock", "local", "api"])
    .default("mock"),

  LLM_LOCAL_URL: z.string().url().optional(),

  LLM_LOCAL_MODEL: z.string().min(1).optional(),

  LLM_API_URL: z.string().url().optional(),

  LLM_API_KEY: z.string().min(1).optional(),

  LLM_MODEL: z.string().min(1).default("gpt-4o-mini"),

  DATABASE_URL: z
    .string()
    .min(1),

  // 2026-09-01 17:22:23 시점에는 fastapi 를 사용중입니다. 기존에 Worker 방식을 사용할 예정에서 변경되었기 때문에 이러한 형태입니다.
  WORKER_URL: z
    .string()
    .url(),

  WORKER_MODE: z
    .enum(["mock", "http"])
    .default("mock"),
}).superRefine((value, ctx) => {
  if (value.SMS_API_ENABLED) {
    for (const key of ["SOLAPI_API_KEY", "SOLAPI_API_SECRET", "SOLAPI_FROM_NUMBER"] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when SMS_API_ENABLED=true`,
        });
      }
    }
  }

  if (value.LLM_MODE === "api") {
    for (const key of ["LLM_API_URL", "LLM_API_KEY"] as const) {
      if (!value[key]) {
        ctx.addIssue({
          code: "custom",
          path: [key],
          message: `${key} is required when LLM_MODE=api`,
        });
      }
    }
  }
});

/**
 * 검증이 끝난 서버 환경변수 객체입니다.
 */
export const env = envSchema.parse(process.env);
