import { z } from "zod";
import { routeCoordinateSchema } from "./route-coordinate.dto.js";
import { routeRequestPointSchema } from "./route-request-point.dto.js";
import { routeSlopeProfileSchema } from "./route-recommendation.dto.js";

export const routeFacilityPointSchema = z.object({
  type: z.enum(["toilet", "store", "light", "security", "walklight"]),
  name: z.string(),
  lat: routeCoordinateSchema.shape.lat,
  lng: routeCoordinateSchema.shape.lng,
});

export const routeFacilityPointsSchema = z.array(routeFacilityPointSchema).default([]);

// 지도 전용 데이터는 기존 feature_values JSON에 보관한다. 과거 경로는 null이다.
export const routeMapLayersSchema = z.object({
  slopeSegments: z.array(z.object({
    fromIndex: z.number().int().nonnegative(),
    toIndex: z.number().int().positive(),
    slopePct: z.number().nonnegative().nullable(),
  }).refine(segment => segment.toIndex > segment.fromIndex)),
  natureSegments: z.array(z.object({
    type: z.enum(["park", "water"]),
    path: z.array(routeCoordinateSchema).min(2),
  })),
  availability: z.object({
    slope: z.boolean(),
    park: z.boolean(),
    water: z.boolean(),
  }),
  nightFacilityTypes: z.array(z.enum(["light", "security", "walklight"])),
  natureCounts: z.object({
    park: z.number().int().nonnegative().nullable(),
    water: z.number().int().nonnegative().nullable(),
  }).optional(),
}).nullable().default(null);

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
  mapLayers: routeMapLayersSchema,
}).refine(detail => (
  detail.mapLayers?.slopeSegments.every(segment => segment.toIndex < detail.path.length) ?? true
), { message: "지도 경사 구간이 경로 좌표 범위를 벗어났습니다.", path: ["mapLayers", "slopeSegments"] });

export type RouteDetailDTO =
  z.infer<typeof routeDetailSchema>;
