import { z } from "zod";
import { routeRequestPointSchema } from "../route/route-request-point.dto.js";

export const workerRouteRequestSchema = z.object({
  requestId: z.number().int(),

  points: z.array(routeRequestPointSchema),

  conditions: z.record(
    z.string(),
    z.unknown()
  ),

  maxCandidates: z.number()
    .int()
    .min(1)
    .max(10)
    .default(3),
});

export type WorkerRouteRequestDTO =
  z.infer<typeof workerRouteRequestSchema>;