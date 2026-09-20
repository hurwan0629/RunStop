import { z } from "zod";
import { routeCoordinateSchema } from "../route/route-coordinate.dto.js";
import { routeElementConditionsInputSchema } from "../route/route-request.dto.js";

export const workerRouteRequestSchema = z.object({
  startPoint: routeCoordinateSchema,
  waypoints: z.array(routeCoordinateSchema).default([]),
  // 파이썬 계층에서 LOOP 나 ROUND_TRIP의 경우에 end 지점을 기대하지 않기 때문에 이를 막아주는 방식으로 진행
  endPoint: routeCoordinateSchema.optional(),
  // [2026-09-06 11:27:36] 파이썬 요구사항에 맞춰서 경로 타입 변경
  routeType: z.enum(["LOOP", "ONE_WAY", "ROUND_TRIP"]),
  prompt: z.string().optional(),
  // Node에서 적용한 경사 완화 값을 원래 UI 설정으로 다시 덮어쓰지 않는다.
  elementConditions: routeElementConditionsInputSchema,
  maxCandidates: z.number().int().min(1).max(10).default(3),
});

export type WorkerRouteRequestDTO =
  z.infer<typeof workerRouteRequestSchema>;
