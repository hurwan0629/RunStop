import { z } from "zod";

// 위경도 스키마
export const coordinateSchema = z.object({
  // 위도 -90 ~ 90
  latitude: z.number().min(-90).max(90),
  // 경도 -180 ~ 180
  longitude: z.number().min(-180).max(180),
});

export type CoordinateDTO =
  z.infer<typeof coordinateSchema>;

