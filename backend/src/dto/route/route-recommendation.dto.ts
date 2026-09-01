import { z } from "zod";
import { coordinateSchema } from "../common/coordinate.dto.js";

export const routeRecommendationSchema = z.object({
  idx: z.number().int(),

  score: z.number(),

  totalDistanceM: z.number(),

  totalAscentM: z.number(),

  slopeStd: z.number().nullable(),

  featureValues: z.record(
    z.string(),
    z.number()
  ),

  featureScores: z.record(
    z.string(),
    z.number()
  ),

  path: z.array(coordinateSchema),
});

export type RouteRecommendationDTO =
  z.infer<typeof routeRecommendationSchema>;