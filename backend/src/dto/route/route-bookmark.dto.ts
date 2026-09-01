import { z } from "zod";
import { coordinateSchema } from "../common/coordinate.dto.js";

export const pointBookmarkSchema = z.object({
  name: z.string().min(1).max(100),

  point: coordinateSchema,
});

export type PointBookmarkDTO =
  z.infer<typeof pointBookmarkSchema>;