import { z } from "zod";

export const routeSelectSchema = z.object({
  recommendationIdx: z.number().int().positive(),
});

export const routeSelectResponseSchema = z.object({
  requestIdx: z.number().int().positive(),
  selectedRecommendationIdx: z.number().int().positive(),
});

export type RouteSelectDTO =
  z.infer<typeof routeSelectSchema>;

export type RouteSelectResponseDTO =
  z.infer<typeof routeSelectResponseSchema>;
