import { z } from "zod";
import { routeCoordinateSchema } from "./route-coordinate.dto.js";
import { routeRequestPointSchema } from "./route-request-point.dto.js";
import { routeSlopeProfileSchema } from "./route-recommendation.dto.js";

export const routeFacilityPointSchema = z.object({
  type: z.enum(["toilet", "store"]),
  name: z.string(),
  lat: routeCoordinateSchema.shape.lat,
  lng: routeCoordinateSchema.shape.lng,
});

export const routeFacilityPointsSchema = z.array(routeFacilityPointSchema).default([]);

export const routeDetailSchema = z.object({
  // 사용자의 경로 상세 요청에는 route_recommendations.idx
  idx: z.number().int().positive(),
  // route_recommendations.name
  name: z.string(),
  // route_recommendations.tota_distance
  totalDistance: z.number().int().nullable(),
  // route_recommendations.total_ascent
  totalAscent: z.number().nullable(),
  // route_recommendations.slope_std - 이건 확정일듯
  slopeStd: z.number().nullable(),
  // 경사 프로필
  slope: routeSlopeProfileSchema.nullable(),
  // route_bookmarks join exists
  isBookmarked: z.boolean(),
  // route_recommendations.route::geometry(LineString, 4326)
  path: z.array(routeCoordinateSchema),
  // route_recommendations.idx를 route_points.route_recommendations_idx 로 fk를 갖고있는
  // 모든 route_points들에 대해서 [sequence, pointType[START, WAYPOINT, END], lat, lng] 를 받아줌.
  points: z.array(routeRequestPointSchema),
  facilityPoints: routeFacilityPointsSchema,
});   

export type RouteDetailDTO =
  z.infer<typeof routeDetailSchema>;
