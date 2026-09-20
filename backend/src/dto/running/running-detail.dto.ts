import { z } from "zod";
import { routeCoordinateSchema } from "../route/route-coordinate.dto.js";
import { routeFacilityPointsSchema, routeMapLayersSchema } from "../route/route-detail.dto.js";
import { routeSlopeProfileSchema } from "../route/route-recommendation.dto.js";

export const runningEnvironmentSchema = z.object({
  facilityPoints: routeFacilityPointsSchema,
  mapLayers: routeMapLayersSchema,
  slope: routeSlopeProfileSchema.nullable(),
});

export const runningSegmentSchema = z.object({
  distanceFrom: z.number().nonnegative(),
  distanceTo: z.number().positive(),
  durationSeconds: z.number().positive(),
  pace: z.number().positive(),
  path: z.array(routeCoordinateSchema).min(2),
  environment: runningEnvironmentSchema.nullable(),
});

export const recordedRouteSchema = z.object({
  idx: z.number().int().positive(),
  routeRequestIdx: z.number().int().positive(),
  name: z.string(),
  score: z.number().nullable(),
  totalDistance: z.number().nullable(),
  totalAscent: z.number().nullable(),
  path: z.array(routeCoordinateSchema),
  featureValues: z.record(z.string(), z.unknown()).nullable().optional(),
  featureScores: z.record(z.string(), z.number().nullable()).nullable().optional(),
});

// 과거 JSON을 새 추천 입력 규칙으로 다시 해석하지 않고 저장된 그대로 조회한다.
export const recordedRequestSchema = z.object({
  idx: z.number().int().positive(),
  routeType: z.string().nullable().optional(),
  elementConditions: z.record(z.string(), z.unknown()).nullable().optional(),
  selectedRecommendationIdx: z.number().nullable().optional(),
  points: z.array(routeCoordinateSchema.extend({
    sequence: z.number().int(), pointType: z.enum(["START", "WAYPOINT", "END"]),
  })).default([]),
});

export const runningDetailSchema = z.object({
  sessionIdx: z.number().int().positive(),
  userIdx: z.number().int().positive(),
  status: z.string(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  distance: z.number().nullable(),
  averagePace: z.number().nullable(),
  route: recordedRouteSchema.nullable(),
  request: recordedRequestSchema.nullable().optional(),
  trackPaths: z.array(z.array(routeCoordinateSchema)),
  segments: z.array(runningSegmentSchema),
  excludedPointCount: z.number().int().nonnegative(),
  gapCount: z.number().int().nonnegative(),
  analysisStatus: z.enum(["AVAILABLE", "UNAVAILABLE", "INSUFFICIENT", "IN_PROGRESS"]),
});

export type RunningDetailDTO = z.infer<typeof runningDetailSchema>;
export type RunningSegmentDTO = z.infer<typeof runningSegmentSchema>;
