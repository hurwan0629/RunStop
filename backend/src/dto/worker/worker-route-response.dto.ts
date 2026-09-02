import { z } from "zod";
import { routeCoordinateSchema } from "../route/route-coordinate.dto.js";

export const workerRoutePointSchema = z.object({
  sequence: z.number().int().min(0),
  pointType: z.enum(["START", "WAYPOINT", "END"]),
  lat: routeCoordinateSchema.shape.lat,
  lng: routeCoordinateSchema.shape.lng,
  title: z.string().optional(),
  elevation: z.number().nullable().optional(),
  slope: z.number().nullable().optional(),
});

export const workerRouteCandidateSchema = z.object({
  name: z.string().min(1),
  score: z.number().nullable(),
  path: z.array(routeCoordinateSchema).min(2),
  featureScores: z.record(z.string(), z.number()).default({}),
  featureValues: z.record(z.string(), z.unknown()).default({}),
  totalDistance: z.number().int().positive().nullable(),
  totalAscent: z.number().nullable(),
  slopeStd: z.number().nullable(),
  points: z.array(workerRoutePointSchema).default([]),
});

export const workerRouteResponseSchema = z.object({
  candidates: z.array(workerRouteCandidateSchema).min(1),
});

export type WorkerRoutePointDTO =
  z.infer<typeof workerRoutePointSchema>;

export type WorkerRouteCandidateDTO =
  z.infer<typeof workerRouteCandidateSchema>;

export type WorkerRouteResponseDTO =
  z.infer<typeof workerRouteResponseSchema>;
