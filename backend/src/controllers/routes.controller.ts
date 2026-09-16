import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { routeDetailSchema } from "../dto/route/route-detail.dto.js";
import { routeRecommendResponseSchema } from "../dto/route/route-recommendation.dto.js";
import { routeRequestSchema } from "../dto/route/route-request.dto.js";
import {
  routeSelectResponseSchema,
  routeSelectSchema,
} from "../dto/route/route-select.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  getRouteDetail as getRouteDetailService,
  recommendRoutes as recommendRoutesService,
  selectRouteRecommendation as selectRouteRecommendationService,
} from "../services/route-recommendation.service.js";

const routeRequestParamsSchema = z.object({
  requestIdx: z.coerce.number().int().positive(),
});

const routeDetailParamsSchema = z.object({
  routeIdx: z.coerce.number().int().positive(),
});

function getAuthenticatedUserIdx(req: Request): number {
  if (!req.user) {
    throw new ApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증이 필요합니다.",
    });
  }

  return req.user.idx;
}

export async function recommendRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = routeRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_RECOMMEND_REQUEST",
      message: "코스 추천 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  // 경로 요청 데이터와 함께 이를 userIdx와 함께 묶어서 생성 후 DB에 저장하는 서비스 계층 route-recommendation.service
  // 여기에서 routeRequestSchema가 파이썬에 보내질 WorkerRouteRequestDTO 형태로 재구성되어서 보내짐.
  const result = await recommendRoutesService(userIdx, parseResult.data);

  res.json({
    success: true,
    data: routeRecommendResponseSchema.parse(result),
  });
}

export async function selectRouteRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const paramsResult = routeRequestParamsSchema.safeParse(req.params);

  if (!paramsResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_REQUEST_PARAMS",
      message: "경로 추천 요청 경로 값이 올바르지 않습니다.",
      details: paramsResult.error.flatten(),
    });
  }

  const bodyResult = routeSelectSchema.safeParse(req.body);

  if (!bodyResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_SELECT_REQUEST",
      message: "추천 코스 선택 요청 값이 올바르지 않습니다.",
      details: bodyResult.error.flatten(),
    });
  }

  const result = await selectRouteRecommendationService(
    userIdx,
    paramsResult.data.requestIdx,
    bodyResult.data,
  );

  res.json({
    success: true,
    data: routeSelectResponseSchema.parse(result),
  });
}

export async function getRouteDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  // routeDetailParamsScehema 라는 러닝 경로 상세 조회 api의 파라미터 dto
  const paramsResult = routeDetailParamsSchema.safeParse(req.params);

  if (!paramsResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_DETAIL_PARAMS",
      message: "추천 코스 경로 값이 올바르지 않습니다.",
      details: paramsResult.error.flatten(),
    });
  }

  // route_recommendations.idx에 대한 
  // route_recommendation [대표 상태들 + linestring]
  // route_points [지나가는 주요 지점들]
  // route_bookmarks [북마크 여부]
  // 응답 DTO인 routeDetailSchema에 맞춰주는 데이터
  const result = await getRouteDetailService(userIdx, paramsResult.data.routeIdx);

  res.json({
    success: true,
    data: routeDetailSchema.parse(result),
  });
}
