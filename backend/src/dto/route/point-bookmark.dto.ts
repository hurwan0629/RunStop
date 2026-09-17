import { z } from "zod";

export const routeBookmarkSchema = z.object({
  recommendationId: z.number().int().positive(),
});

export const routeBookmarkResponseSchema = z.object({
  bookmarkIdx: z.number().int(),
  routeRecommendationIdx: z.number().int(),
  name: z.string(),
  totalDistance: z.number().int().nullable(),
  totalAscent: z.number().nullable(),
  slopeStd: z.number().nullable(),
});

export const routeBookmarkCreateResponseSchema = z.object({
  bookmarkIdx: z.number().int(),
  routeRecommendationIdx: z.number().int(),
});

export const routeBookmarkListResponseSchema = z.object({
  items: z.array(routeBookmarkResponseSchema),
  page: z.number().int(),
  limit: z.number().int(),
});

export type RouteBookmarkDTO =
  z.infer<typeof routeBookmarkSchema>;

export type RouteBookmarkResponseDTO =
  z.infer<typeof routeBookmarkResponseSchema>;

export type RouteBookmarkCreateResponseDTO =
  z.infer<typeof routeBookmarkCreateResponseSchema>;

export type RouteBookmarkListResponseDTO =
  z.infer<typeof routeBookmarkListResponseSchema>;
