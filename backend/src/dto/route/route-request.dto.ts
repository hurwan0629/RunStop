import { z } from "zod";
import { routeCoordinateSchema } from "./route-coordinate.dto.js";

export type RouteRequirementValue = boolean | number;

export const ROUTE_WEIGHT_KEYS = new Set([
  "distance",
  "elevation",
  "safety",
  "night",
  "nature",
  "park",
  "surface",
  "flow",
  "overlap",
  "toilet",
  "store",
]);

export const ROUTE_BOOLEAN_REQUIREMENT_KEYS = new Set([
  "toilet",
  "store",
  "park",
  "no_stairs",
]);

export const ROUTE_NUMBER_REQUIREMENT_KEYS = new Set([
  "max_slope_pct",
  "max_slope",
  "maxSlope",
]);

/**
 * route/recommend 에서 파이썬 fastapi 의 /recommend 로 넘겨질 dto의 weight 요구 스키마입니다.
 */
export function sanitizeRouteWeights(value: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};

  // 기대하는 키가 아니면 그냥 삭제해주거나 조절해주기
  for (const [key, raw] of Object.entries(value)) {
    if (!ROUTE_WEIGHT_KEYS.has(key)) {
      continue;
    }

    const numberValue = Number(raw);
    if (Number.isFinite(numberValue)) {
      out[key] = Math.min(5, Math.max(1, Math.round(numberValue)));
    }
  }

  return out;
}

/**
 * route/recommend 에서 파이썬 fastapi 의 /recommend 로 넘겨질 dto의 requirements 요구 스키마입니다.
 */
export function sanitizeRouteRequirements(
  value: Record<string, unknown>,
): Record<string, RouteRequirementValue> {
  const out: Record<string, RouteRequirementValue> = {};

  // 기대하는 키가 아니면 그냥 삭제해주거나 조절해주기
  for (const [key, raw] of Object.entries(value)) {
    if (ROUTE_BOOLEAN_REQUIREMENT_KEYS.has(key)) {
      if (typeof raw === "boolean") {
        out[key] = raw;
      }
      continue;
    }

    if (ROUTE_NUMBER_REQUIREMENT_KEYS.has(key)) {
      const numberValue = Number(raw);
      if (Number.isFinite(numberValue)) {
        out[key] = numberValue;
      }
    }
  }

  return out;
}

export const routeElementConditionsSchema = z.object({
  targetDistance: z.number().positive(),
  maxSlope: z.number().nonnegative().optional(),
  facilityCount: z.number().int().nonnegative().optional(),
  weights: z.record(z.string(), z.unknown()).default({}).transform(sanitizeRouteWeights),
  requirements: z.record(z.string(), z.unknown()).default({}).transform(sanitizeRouteRequirements),
}).catchall(z.unknown());

export const routeRequestSchema = z.object({
  prompt: z.string().trim().min(1).optional(),
  routeType: z.enum(["LOOP", "ROUND_TRIP", "ONE_WAY"]),
  startPoint: routeCoordinateSchema,
  waypoints: z.array(routeCoordinateSchema).default([]),
  endPoint: routeCoordinateSchema.optional(),
  elementConditions: routeElementConditionsSchema,
});

export type RouteElementConditionsDTO =
  z.infer<typeof routeElementConditionsSchema>;

export type RouteRequestDTO =
  z.infer<typeof routeRequestSchema>;
