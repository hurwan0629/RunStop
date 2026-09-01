import { z } from "zod";

export const routeSelectSchema = z.object({
  recommendationId: z.number().int().positive(),
});

export type RouteSelectDTO =
  z.infer<typeof routeSelectSchema>;