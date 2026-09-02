import { z } from "zod";
import { coordinateSchema } from "../common/coordinate.dto.js";

export const pointBookmarkSchema = z.object({
  name: z.string().min(1).max(100),

  point: coordinateSchema,
});

export const bookmarkListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const pointBookmarkResponseSchema = z.object({
  bookmarkIdx: z.number().int(),
  name: z.string(),
  point: coordinateSchema,
});

export const pointBookmarkListResponseSchema = z.object({
  items: z.array(pointBookmarkResponseSchema),
  page: z.number().int(),
  limit: z.number().int(),
});

export const deleteBookmarkResponseSchema = z.object({
  deleted: z.literal(true),
});

export type PointBookmarkDTO =
  z.infer<typeof pointBookmarkSchema>;

export type BookmarkListQueryDTO =
  z.infer<typeof bookmarkListQuerySchema>;

export type PointBookmarkResponseDTO =
  z.infer<typeof pointBookmarkResponseSchema>;

export type PointBookmarkListResponseDTO =
  z.infer<typeof pointBookmarkListResponseSchema>;

export type DeleteBookmarkResponseDTO =
  z.infer<typeof deleteBookmarkResponseSchema>;
