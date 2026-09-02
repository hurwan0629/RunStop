import { z } from "zod";

export const runningHistoryItemSchema = z.object({
  idx: z.number().int(),

  status: z.enum(["COMPLETED", "STOPPED", "FAILED"]),

  startedAt: z.string(),

  finishedAt: z.string().nullable(),

  distance: z.number().nullable(),

  averagePace: z.number().nullable(),
});

export const runningHistoryResponseSchema = z.object({
  items: z.array(runningHistoryItemSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
});

export type RunningHistoryItemDTO =
  z.infer<typeof runningHistoryItemSchema>;

export type RunningHistoryResponseDTO =
  z.infer<typeof runningHistoryResponseSchema>;
