import { z } from "zod";

export const runningSessionSchema = z.object({
  idx: z.number().int(),

  recommendationId: z.number().int(),

  startedAt: z.string(),

  finishedAt: z.string().nullable(),

  averagePaceSecPerKm: z.number().nullable(),
});

export type RunningSessionDTO =
  z.infer<typeof runningSessionSchema>;