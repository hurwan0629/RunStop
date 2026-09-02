import { z } from "zod";
import { routeCoordinateSchema } from "./route-coordinate.dto.js";
import { routeRequestPointSchema } from "./route-request-point.dto.js";

export const routeDetailSchema = z.object({
  idx: z.number().int().positive(),
  name: z.string(),
  totalDistance: z.number().int().nullable(),
  totalAscent: z.number().nullable(),
  slopeStd: z.number().nullable(),
  isBookmarked: z.boolean(),
  path: z.array(routeCoordinateSchema),
  points: z.array(routeRequestPointSchema),
});

export type RouteDetailDTO =
  z.infer<typeof routeDetailSchema>;
