import { z } from "zod";

export const runningStartSchema = z.object({
  recommendationId: z.number().int().positive(),
});

export type RunningStartDTO =
  z.infer<typeof runningStartSchema>;