import { z } from "zod";
import { coordinateSchema } from "../common/coordinate.dto.js";

export const runningTrackpointSchema = z.object({
  point: coordinateSchema,

  recordedAt: z.string(),

  accuracyM: z.number().nonnegative().optional(),
});


export const runningTrackpointsSchema = z.object({
  sessionId: z.number().int().positive(),
  
  points: z.array(
    runningTrackpointSchema
  ).min(1),
});

export type RunningTrackpointDTO =
  z.infer<typeof runningTrackpointSchema>;