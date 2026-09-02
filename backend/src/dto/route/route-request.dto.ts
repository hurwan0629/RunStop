import { z } from "zod";
import { routeCoordinateSchema } from "./route-coordinate.dto.js";

// 향후 변경될 요청용 값
export const routeElementConditionsSchema = z.object({
  targetDistance: z.number().positive(),
  maxSlope: z.number().nonnegative().optional(),
  facilityCount: z.number().int().nonnegative().optional(),
}).catchall(z.unknown());

export const routeRequestSchema = z.object({
  prompt: z.string().trim().min(1).optional(),
  startPoint: routeCoordinateSchema,
  waypoints: z.array(routeCoordinateSchema).default([]),
  endPoint: routeCoordinateSchema.optional(),
  elementConditions: routeElementConditionsSchema,
});

export type RouteElementConditionsDTO =
  z.infer<typeof routeElementConditionsSchema>;

export type RouteRequestDTO =
  z.infer<typeof routeRequestSchema>;
