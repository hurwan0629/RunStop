import { z } from "zod";
import { routeRecommendationSchema } from "./route-recommendation.dto.js";
import { routeRequestPointSchema } from "./route-request-point.dto.js";

export const routeDetailSchema =
  routeRecommendationSchema.extend({
    points: z.array(routeRequestPointSchema),

    createdAt: z.string(),
  });

export type RouteDetailDTO =
  z.infer<typeof routeDetailSchema>;