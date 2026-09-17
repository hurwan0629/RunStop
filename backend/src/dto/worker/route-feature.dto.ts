import { z } from "zod";

export const routeFeatureSchema = z.object({
  distanceM: z.number(),

  distanceErrorM: z.number(),

  totalAscentM: z.number(),

  slopeMeanPercent: z.number().optional(),

  slopeMaxPercent: z.number().optional(),

  slopeStdPercent: z.number().optional(),

  toiletCount: z.number().int(),

  nearestToiletDistanceM: z.number().nullable(),

  convenienceStoreCount: z.number().int(),

  nearestStoreDistanceM: z.number().nullable(),

  streetlightScore: z.number().optional(),

  cctvScore: z.number().optional(),

  pedestrianRoadRatio: z.number().min(0).max(1).optional(),
});

export type RouteFeatureDTO =
  z.infer<typeof routeFeatureSchema>;