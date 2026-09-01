import { z } from "zod";
import { coordinateSchema } from "../common/coordinate.dto.js";
import { routeFeatureSchema } from "./route-feature.dto.js";

export const workerRouteResponseSchema = z.object({
  requestId: z.number().int(),

  candidates: z.array(
    z.object({
      score: z.number(),

      path: z.array(coordinateSchema),

      features: routeFeatureSchema,

      featureScores: z.record(
        z.string(),
        z.number()
      ),
    })
  ),
});

export type WorkerRouteResponseDTO =
  z.infer<typeof workerRouteResponseSchema>;