import { z } from "zod";

export const runningStartSchema = z.object({
  routeRecommendationIdx: z.number().int().positive(),

  startedAt: z.string().datetime(),
});

export type RunningStartDTO =
  z.infer<typeof runningStartSchema>;
