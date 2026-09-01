import { z } from "zod";

export const runningHistoryItemSchema = z.object({
  sessionId: z.number().int(),

  routeId: z.number().int(),

  startedAt: z.string(),

  distanceM: z.number(),

  durationSec: z.number(),

  averagePaceSecPerKm: z.number().nullable(),

  totalAscentM: z.number().nullable(),
});

export type RunningHistoryItemDTO =
  z.infer<typeof runningHistoryItemSchema>;