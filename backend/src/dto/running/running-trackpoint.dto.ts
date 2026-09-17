import { z } from "zod";

export const runningTrackpointSchema = z.object({
  clientTrackpointId: z.string().uuid(),

  lat: z.number().min(-90).max(90),

  lng: z.number().min(-180).max(180),

  recordedAt: z.string().datetime(),

  accuracy: z.number().nonnegative().optional(),
});


export const runningTrackpointsSchema = z.object({
  trackpoints: z.array(
    runningTrackpointSchema
  ).min(1),
});

export type RunningTrackpointDTO =
  z.infer<typeof runningTrackpointSchema>;

export type RunningTrackpointsDTO =
  z.infer<typeof runningTrackpointsSchema>;
