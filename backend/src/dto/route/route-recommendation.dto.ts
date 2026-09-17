import { z } from "zod";

export const routeSlopeProfileSchema = z.object({
  avgSlopePct: z.number().nullable(),
  maxSlopePct: z.number().nullable(),
  slopeStdPct: z.number().nullable(),
  elevationGainM: z.number().nullable(),
  elevationLossM: z.number().nullable(),
  sampleCount: z.number().int().nonnegative(),
});

export const routeFacilityStatusSchema = z.enum([
  "MET",
  "RELAXED",
  "IGNORE",
]);

export const routeFacilityItemSchema = z.object({
  count: z.number().int().nonnegative(),
  status: routeFacilityStatusSchema,
});

export const routeFacilitySummarySchema = z.object({
  toilet: routeFacilityItemSchema,
  store: routeFacilityItemSchema,
});

export type RouteSlopeProfileDTO =
  z.infer<typeof routeSlopeProfileSchema>;

export const routeRecommendationSchema = z.object({
  idx: z.number().int().positive(),
  name: z.string(),
  score: z.number().nullable(),
  totalDistance: z.number().int().nullable(),
  totalAscent: z.number().nullable(),
  slopeStd: z.number().nullable(),
  slope: routeSlopeProfileSchema.nullable(),
  featureScores: z.record(z.string(), z.number().nullable()),
  facilities: routeFacilitySummarySchema,
});

export const routeRecommendResponseSchema = z.object({
  requestIdx: z.number().int().positive(),
  recommendations: z.array(routeRecommendationSchema),
});

export type RouteRecommendationDTO =
  z.infer<typeof routeRecommendationSchema>;

export type RouteRecommendResponseDTO =
  z.infer<typeof routeRecommendResponseSchema>;
