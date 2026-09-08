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

// 하나의 경로 후보에 존재하는 내용을 넣음
// path: 지나가는 경로들의 집합 (2개 이상이여야함.)
// 이름, 점수, 경로(lat, lng) 경사도, 총 거리, 총 상승 고도, 경사도 표준편차
export const workerRouteCandidateSchema = z.object({
  // 경로 이름은 있어야함.
  name: z.string().min(1),
  // 점수도 있어야함.
  score: z.number().nullable(),
  // 경로는 향후 바뀔 예정 없음
  path: z.array(routeCoordinateSchema).min(2),
  // 시설 점수
  // { string: ?? } 형태의 스키마
  featureScores: z.record(z.string(), z.number()).default({}),
  // 시설 상세 정보 (화장실이 몇개이니 등등 하는것들)
  // { string: ?? } 형태의 스키마
  featureValues: z.record(z.string(), z.unknown()).default({}),
  // 총 거리
  totalDistance: z.number().int().positive().nullable(),
  // 총 올라간 고도 - 이것도 확정
  totalAscent: z.number().nullable(),
  // 경사도 표준편차: [2026-09-06 13:48:52] 기준 넣을거같긴 하지만 아직 명확하진 않음.
  slopeStd: z.number().nullable(),
  // 사용자가 요청한 포인트들
  points: z.array(workerRoutePointSchema).default([]),
});

// 워커에서 여러 후보들을 응답하는 형태
export const workerRouteResponseSchema = z.object({
  candidates: z.array(workerRouteCandidateSchema).min(0),
});

export type WorkerRoutePointDTO =
  z.infer<typeof workerRoutePointSchema>;

export type WorkerRouteCandidateDTO =
  z.infer<typeof workerRouteCandidateSchema>;

export type WorkerRouteResponseDTO =
  z.infer<typeof workerRouteResponseSchema>;
