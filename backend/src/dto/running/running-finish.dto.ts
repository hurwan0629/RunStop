import { z } from "zod";

export const runningFinishSchema = z.object({
  sessionId: z.number().int().positive(),

  finishedAt: z.string(),
});

export type RunningFinishDTO =
  z.infer<typeof runningFinishSchema>;