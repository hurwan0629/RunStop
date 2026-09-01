import { z } from "zod";
import { coordinateSchema } from "../common/coordinate.dto.js";

export const routeRequestPointSchema = z.object({
  sequence: z.number().int().min(0),

  type: z.enum([
    "START",
    "WAYPOINT",
    "END",
  ]),

  point: coordinateSchema,
});

export type RouteRequestPointDTO =
  z.infer<typeof routeRequestPointSchema>;