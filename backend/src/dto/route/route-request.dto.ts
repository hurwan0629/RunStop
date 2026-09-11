import { z } from "zod";
import { routeCoordinateSchema } from "./route-coordinate.dto.js";

// 향후 변경될 요청용 값
export const routeElementConditionsSchema = z.object({
  targetDistance: z.number().positive(),
  maxSlope: z.number().nonnegative().optional(),
  facilityCount: z.number().int().nonnegative().optional(),
  weights: z.record(z.string(), z.number().min(1).max(5)).default({}),
  requirements: z.record(z.string(), z.boolean()).default({})
}).catchall(z.unknown());


export const routeRequestSchema = z.object({
  // 사용자 프롬프트
  prompt: z.string().trim().min(1).optional(),
  // [2026-09-06 11:59:25] 알고리즘에서 기대하는 형태의 모드 방식으로 보내주기 추가
  routeType: z.enum(["LOOP", "ROUND_TRIP", "ONE_WAY"]),
  // 시작 포인트 위경도
  startPoint: routeCoordinateSchema,
  // 경유지 배열. 기본적으로 빈 리스트로 설정
  waypoints: z.array(routeCoordinateSchema).default([]),
  // 종료 포인트 위경도 (LOOP 또는 ROUND_TRIP의 경우에는 받지 않음)
  endPoint: routeCoordinateSchema.optional(),
  // 파이썬 쪽에서 받게될 환경 변수들
  elementConditions: routeElementConditionsSchema,
}); 

export type RouteElementConditionsDTO =
  z.infer<typeof routeElementConditionsSchema>;

export type RouteRequestDTO =
  z.infer<typeof routeRequestSchema>;
