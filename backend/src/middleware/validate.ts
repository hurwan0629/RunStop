import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

/**
 * 컨트롤러 실행 전에 요청 본문, 경로 매개변수, 쿼리 문자열 데이터를 Zod 스키마로 검증합니다.
 */
export function validate(schema: ZodSchema, source: "body" | "params" | "query") {
  
}