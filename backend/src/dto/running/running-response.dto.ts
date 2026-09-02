import { z } from "zod";

export const runningStartResponseSchema = z.object({
  sessionIdx: z.number().int().positive(),
  status: z.literal("IN_PROGRESS"),
});

export const runningTrackpointsResponseSchema = z.object({
  savedCount: z.number().int().nonnegative(),
});

export const runningFinishResponseSchema = z.object({
  sessionIdx: z.number().int().positive(),
  status: z.literal("COMPLETED"),
  distance: z.number().int().nonnegative(),
  averagePace: z.number().int().positive().nullable(),
});

export const runningPaceSegmentSchema = z.object({
  distanceFrom: z.number().int().nonnegative(),
  distanceTo: z.number().int().positive(),
  pace: z.number().int().positive(),
});

export const runningPaceResponseSchema = z.object({
  sessionIdx: z.number().int().positive(),
  averagePace: z.number().int().positive().nullable(),
  segments: z.array(runningPaceSegmentSchema),
});

export type RunningStartResponseDTO =
  z.infer<typeof runningStartResponseSchema>;

export type RunningTrackpointsResponseDTO =
  z.infer<typeof runningTrackpointsResponseSchema>;

export type RunningFinishResponseDTO =
  z.infer<typeof runningFinishResponseSchema>;

export type RunningPaceSegmentDTO =
  z.infer<typeof runningPaceSegmentSchema>;

export type RunningPaceResponseDTO =
  z.infer<typeof runningPaceResponseSchema>;
