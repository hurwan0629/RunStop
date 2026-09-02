import { z } from "zod";
import { routeCoordinateSchema } from "../route/route-coordinate.dto.js";
import { routeElementConditionsSchema } from "../route/route-request.dto.js";

export const workerRouteRequestSchema = z.object({
  startPoint: routeCoordinateSchema,
  waypoints: z.array(routeCoordinateSchema).default([]),
  endPoint: routeCoordinateSchema,
  isRoundTrip: z.boolean(),
  prompt: z.string().optional(),
  elementConditions: routeElementConditionsSchema,
  maxCandidates: z.number().int().min(1).max(10).default(3),
});

export type WorkerRouteRequestDTO =
  z.infer<typeof workerRouteRequestSchema>;
