import { z } from "zod";
import { routeRequestPointSchema } from "./route-request-point.dto.js";

export const routeRequestSchema = z.object({
  prompt: z.string().optional(),

  points: z
    .array(routeRequestPointSchema)
    .min(1),

  conditions: z.object({
    targetDistanceM: z.number().positive(),

    distanceToleranceM: z
      .number()
      .nonnegative()
      .optional(),

    maxSlopePercent: z
      .number()
      .optional(),

    preferToilet: z.boolean().optional(),

    preferConvenienceStore: z.boolean().optional(),

    preferNightInfrastructure: z.boolean().optional(),

    extra: z.record(
      z.string(),
      z.unknown()
    ).optional(),
  }),
});

export type RouteRequestDTO =
  z.infer<typeof routeRequestSchema>;