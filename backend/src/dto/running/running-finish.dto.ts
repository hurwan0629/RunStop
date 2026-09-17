import { z } from "zod";

export const runningFinishSchema = z.object({
  finishedAt: z.string().datetime(),
});

export type RunningFinishDTO =
  z.infer<typeof runningFinishSchema>;
