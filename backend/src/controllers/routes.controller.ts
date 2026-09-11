import type { Request, Response, NextFunction } from "express";
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
import { getRouteConditionLlmClient } from "../adapters/llm/llm.client.js";

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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function asNumberRecord(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};

  for (const [key, raw] of Object.entries(asRecord(value))) {
    const numberValue = Number(raw);
    if (Number.isFinite(numberValue)) {
      out[key] = numberValue;
    }
  }

  return out;
}

/**
 * 경로 추천 요청을 생성하고 워커의 후보 경로를 저장합니다.
 */
export async function recommendRoutes(req: Request, res: Response, next: NextFunction): Promise<void> {
  // req.users 존재 확인하기
  const userIdx = getAuthenticatedUserIdx(req);
  // 사용자의 요청 스키마가 서버의 예상과 같은지 확인하기 [2026-09-02 20:11:08] 기준 임시 명세와 동일한 형태. 나중에 알고리즘 쪽과 맞추어야함
  // [2026-09-02 20:17:47] 기준 routeRequestSchema와 dto/worker/worker-route-request.dto.ts 파일의 workerRouteRequestSchema 는 나누어져있습니다.
  const parseResult = routeRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_RECOMMEND_REQUEST",
      message: "코스 추천 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  // [2026-09-11 09:11:19] 기존 요청을 그대로 받아주기
  let routeRequest = parseResult.data;

  // 요청에 prompt가 있으면 만들어둔 llm을 이용하셔 weight, requirements, raw? 를 반환해주기
  if (routeRequest.prompt) {
    // 한번 올바른 타입으로 확인해주기 (typecheck용)
    const weights = asNumberRecord(routeRequest.elementConditions.weights);
    const requirements = asRecord(routeRequest.elementConditions.requirements);

    // llmClient 받아서 받은 프롬프트 및 기타 데이터 변형하여 받아주기
    const parsedConditions = await getRouteConditionLlmClient().parseRouteConditions({
      prompt: routeRequest.prompt,
      targetDistance: routeRequest.elementConditions.targetDistance,
      weights,
      requirements,
    });

    // 실제로 사용할 요청 객체를 만들어주기
    routeRequest = {
      // 기존 요청값을 그대로 먼저 사용
      ...routeRequest,
      // 거기에 추가로 사용할 요청 가중치들 다시 받아주기
      // 덮어 씌워진 부분은 아래에 다시 풀어주기.
      elementConditions: {
        ...routeRequest.elementConditions,
        weights: {
          ...weights,
          ...parsedConditions.weights,
        },
        requirements: {
          ...requirements,
          ...parsedConditions.requirements,
        },
      },
    };
  }

  // 경로 요청 데이터와 함께 이를 userIdx와 함께 묶어서 생성 후 DB에 저장하는 서비스 계층 route-recommendation.service
  const result = await recommendRoutesService(userIdx, routeRequest);

  res.json({
    success: true,
    data: routeRecommendResponseSchema.parse(result),
  });
}

/**
 * 이미 생성된 경로 추천 요청에서 하나의 추천 코스를 선택합니다.
 */
export async function selectRouteRecommendation(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  // 경로 변수의 requestIdx를 받아줍니다
  const paramsResult = routeRequestParamsSchema.safeParse(req.params);

  if (!paramsResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_REQUEST_PARAMS",
      message: "경로 추천 요청 경로 값이 올바르지 않습니다.",
      details: paramsResult.error.flatten(),
    });
  }

  // body에 존재하는 recommendationIdx를 받아줍니다.
  const bodyResult = routeSelectSchema.safeParse(req.body);

  if (!bodyResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_SELECT_REQUEST",
      message: "추천 코스 선택 요청 값이 올바르지 않습니다.",
      details: bodyResult.error.flatten(),
    });
  }

  // 사용자가 한 경로 요청에 대해서 추천된 후보를 선택했을 때, 사용자가 선택한 경로 후보를 사용자의 요청에 등록해주기
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

/**
 * 추천 코스의 전체 경로와 주요 지점 상세 데이터를 반환합니다.
 */
export async function getRouteDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
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
  const result = await getRouteDetailService(userIdx, paramsResult.data.routeIdx);

  res.json({
    success: true,
    data: routeDetailSchema.parse(result),
  });
}
