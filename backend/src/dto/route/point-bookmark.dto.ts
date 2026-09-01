import { z } from "zod";

export const routeBookmarkSchema = z.object({
  recommendationId: z.number().int().positive(),
});

export type RouteBookmarkDTO =
  z.infer<typeof routeBookmarkSchema>;