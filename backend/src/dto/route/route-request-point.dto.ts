import { z } from "zod";
import { routeCoordinateSchema } from "./route-coordinate.dto.js";

export const routePointTypeSchema = z.enum([
  "START",
  "WAYPOINT",
  "END",
]);

export const routeRequestPointSchema = z.object({
  sequence: z.number().int().min(0),
  pointType: routePointTypeSchema,
  lat: routeCoordinateSchema.shape.lat,
  lng: routeCoordinateSchema.shape.lng,
});

export type RoutePointTypeDTO =
  z.infer<typeof routePointTypeSchema>;

export type RouteRequestPointDTO =
  z.infer<typeof routeRequestPointSchema>;
