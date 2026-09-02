import { z } from "zod";

export const routeRecommendationSchema = z.object({
  idx: z.number().int().positive(),
  name: z.string(),
  score: z.number().nullable(),
  totalDistance: z.number().int().nullable(),
  totalAscent: z.number().nullable(),
  slopeStd: z.number().nullable(),
});

export const routeRecommendResponseSchema = z.object({
  requestIdx: z.number().int().positive(),
  recommendations: z.array(routeRecommendationSchema),
});

export type RouteRecommendationDTO =
  z.infer<typeof routeRecommendationSchema>;

export type RouteRecommendResponseDTO =
  z.infer<typeof routeRecommendResponseSchema>;
