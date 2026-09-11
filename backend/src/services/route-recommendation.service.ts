import { getRouteConditionLlmClient } from "../adapters/llm/llm.client.js";
import { requestRouteRecommendations } from "../adapters/worker/routing-worker.client.js";
import type { RouteDetailDTO } from "../dto/route/route-detail.dto.js";
import type {
  RouteRecommendResponseDTO,
  RouteRecommendationDTO,
} from "../dto/route/route-recommendation.dto.js";
import type { RouteRequestDTO } from "../dto/route/route-request.dto.js";
import type {
  RouteSelectDTO,
  RouteSelectResponseDTO,
} from "../dto/route/route-select.dto.js";
import type { WorkerRouteCandidateDTO } from "../dto/worker/worker-route-response.dto.js";
import { withTransaction } from "../infra/db/transaction.js";
import { logger } from "../logging/logger.js";
import { ApiError } from "../middleware/error.js";
import { existsRouteBookmark } from "../repositories/bookmarks.repository.js";
import {
  createRouteRequest,
  createRouteRequestPoints,
  findRouteRequestByIdxAndUserIdx,
  selectRecommendationForRequest,
} from "../repositories/route-requests.repository.js";
import {
  createRouteRecommendations,
  findRouteDetailByIdx,
  findRouteRecommendationByIdxAndRequestIdx,
} from "../repositories/route-recommendations.repository.js";
import {
  createRoutePoints,
  findRoutePointsByRecommendationIdx,
} from "../repositories/route-points.repository.js";

function toRouteRecommendationDTO(row: {
  idx: number;
  name: string;
  score: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
  slopeStd: number | null;
}): RouteRecommendationDTO {
  return {
    idx: row.idx,
    name: row.name,
    score: row.score,
    totalDistance: row.totalDistance,
    totalAscent: row.totalAscent,
    slopeStd: row.slopeStd,
  };
}

function buildRouteRequestPoints(dto: RouteRequestDTO) {
  const endPoint = dto.endPoint ?? dto.startPoint;
  const waypointPoints = dto.waypoints.map((waypoint, index) => ({
    sequence: index + 1,
    pointType: "WAYPOINT" as const,
    point: waypoint,
  }));

  return [
    {
      sequence: 0,
      pointType: "START" as const,
      point: dto.startPoint,
    },
    ...waypointPoints,
    {
      sequence: waypointPoints.length + 1,
      pointType: "END" as const,
      point: endPoint,
    },
  ];
}

function ensureCandidatePoints(candidate: WorkerRouteCandidateDTO) {
  if (candidate.points.length > 0) {
    return candidate.points;
  }

  const startPoint = candidate.path[0];
  const endPoint = candidate.path[candidate.path.length - 1];

  if (!startPoint || !endPoint) {
    return [];
  }

  return [
    {
      sequence: 0,
      pointType: "START" as const,
      lat: startPoint.lat,
      lng: startPoint.lng,
      title: "출발지",
    },
    {
      sequence: 1,
      pointType: "END" as const,
      lat: endPoint.lat,
      lng: endPoint.lng,
      title: "도착지",
    },
  ];
}

/**
 * llm을 이용하여 python fastapi에 넣을 response 형태를 만들어줍니다.
 */
async function applyLlmRouteConditions(dto: RouteRequestDTO): Promise<RouteRequestDTO> {
  if (!dto.prompt) {
    return dto;
  }

  // lmm에 
  const parsedConditions = await getRouteConditionLlmClient().parseRouteConditions({
    prompt: dto.prompt,
    targetDistance: dto.elementConditions.targetDistance,
  });

  return {
    ...dto,
    // 기존 데이터에 elementConditions를 넣어줍니다.
    elementConditions: {
      // 기존의 데이터를 넣고
      ...dto.elementConditions,
      // weight를 덮어씌워준다음에
      weights: {
        ...parsedConditions.weights,
        // 기존 사용자가 넣은 데이터를 넣어줍ㄴ디ㅣㅏ.
        ...dto.elementConditions.weights,
      },
      requirements: {
        ...parsedConditions.requirements,
        // 기존 사용자가 넣은 데이터를 덮어씌워줍니다.
        ...dto.elementConditions.requirements,
      },
    },
  };
}

/**
 * 경로 요청을 생성하고 routing-worker를 호출한 뒤 추천 후보를 저장합니다.
 */
export async function recommendRoutes(
  userIdx: number,
  dto: RouteRequestDTO, // /api/routes/recommend에 대한 body DTO를 그대로 받음
): Promise<RouteRecommendResponseDTO> {
  logger.info({
    serviceName: "routes",
    action: "recommendRoutes",
    userIdx,
    waypointCount: dto.waypoints.length,
    hasEndPoint: dto.endPoint !== undefined,
  }, "service:start");

  // // // // // // // // // // // // // // // // //
  //       1. LLM으로 요청 조건을 보강합니다.         //
  // // // // // // // // // // // // // // // // //
  const routeRequest = await applyLlmRouteConditions(dto);

  // // // // // // // // // // // // // // // // //
  //       2. Python routing-worker를 호출합니다.   //
  // // // // // // // // // // // // // // // // //
  const endPoint = routeRequest.endPoint ?? routeRequest.startPoint;
  let workerResponse: Awaited<ReturnType<typeof requestRouteRecommendations>>;

  try {
    logger.info({ serviceName: "routes", action: "recommendRoutes", userIdx }, "service:worker_request:start");

    // input = dto/route/worker-route-request.dto.ts WorkerRouteRequestDTO
    // output = dto/route/worker-route-response.dto.ts WorkerRouterResponseDTO
    workerResponse = await requestRouteRecommendations({
      startPoint: routeRequest.startPoint,
      waypoints: routeRequest.waypoints,
      endPoint,
      routeType: dto.routeType,
      prompt: routeRequest.prompt,
      elementConditions: routeRequest.elementConditions,
      maxCandidates: 3,
    });

    logger.info({
      serviceName: "routes",
      action: "recommendRoutes",
      userIdx,
      candidateCount: workerResponse.candidates.length,
    }, "service:worker_request:success");
  } catch (error) {
    logger.error({ serviceName: "routes", action: "recommendRoutes", userIdx, err: error }, "service:worker_request:error");
    throw error;
  }


  // // // // // // // // // // // // // // // // // // // // // // // // // // 
  // //               [Database] 사용자 요청부터 응답 결과까지 저장            // //
  // // // // // // // // // // // // // // // // // // // // // // // // // // 
  // 워커로부터 응답이 문제 없이 받아졋다면 그대로 다음 3각지 요소를 저장합니다.
  // 1. 사용자 요청
  // 2. 사용자 요청에 포함된 주요 route_points
  // 3. 파이썬 워커의 응답
  const saved = await withTransaction(async (client) => {
    const savedRouteRequest = await createRouteRequest({
      userIdx,
      prompt: routeRequest.prompt,
      elementConditions: routeRequest.elementConditions,
    }, client);

    await createRouteRequestPoints(savedRouteRequest.idx, buildRouteRequestPoints(routeRequest), client);

    const recommendations = await createRouteRecommendations(
      savedRouteRequest.idx,
      workerResponse.candidates,
      client,
    );

    for (const [index, recommendation] of recommendations.entries()) {
      const candidate = workerResponse.candidates[index];

      if (!candidate) {
        continue;
      }

      await createRoutePoints(recommendation.idx, ensureCandidatePoints(candidate), client);
    }

    return {
      routeRequest: savedRouteRequest,
      recommendations,
    };
  });

  logger.info({
    serviceName: "routes",
    action: "recommendRoutes",
    userIdx,
    routeRequestIdx: saved.routeRequest.idx,
    recommendationCount: saved.recommendations.length,
  }, "service:success");

  return {
    requestIdx: saved.routeRequest.idx,
    recommendations: saved.recommendations.map(toRouteRecommendationDTO),
  };
}

/**
 * 생성된 추천 코스 중 하나를 해당 요청의 선택 코스로 표시합니다.
 */
export async function selectRouteRecommendation(
  userIdx: number,
  routeRequestIdx: number,
  dto: RouteSelectDTO,
): Promise<RouteSelectResponseDTO> {
  logger.info({
    serviceName: "routes",
    action: "selectRouteRecommendation",
    userIdx,
    routeRequestIdx,
    recommendationIdx: dto.recommendationIdx,
  }, "service:start");

  const routeRequest = await findRouteRequestByIdxAndUserIdx(routeRequestIdx, userIdx);

  if (!routeRequest) {
    logger.warn({ serviceName: "routes", action: "selectRouteRecommendation", userIdx, routeRequestIdx }, "service:route_request_not_found");

    throw new ApiError({
      status: 404,
      code: "ROUTE_REQUEST_NOT_FOUND",
      message: "경로 추천 요청을 찾을 수 없습니다.",
    });
  }

  if (routeRequest.selectedRecommendationIdx !== null) {
    logger.warn({
      serviceName: "routes",
      action: "selectRouteRecommendation",
      userIdx,
      routeRequestIdx,
      selectedRecommendationIdx: routeRequest.selectedRecommendationIdx,
    }, "service:route_request_already_selected");

    throw new ApiError({
      status: 409,
      code: "ROUTE_REQUEST_ALREADY_SELECTED",
      message: "이미 추천 코스를 선택한 요청입니다.",
    });
  }

  const recommendation = await findRouteRecommendationByIdxAndRequestIdx(
    dto.recommendationIdx,
    routeRequestIdx,
  );

  if (!recommendation) {
    logger.warn({
      serviceName: "routes",
      action: "selectRouteRecommendation",
      userIdx,
      routeRequestIdx,
      recommendationIdx: dto.recommendationIdx,
    }, "service:recommendation_not_in_request");

    throw new ApiError({
      status: 404,
      code: "ROUTE_RECOMMENDATION_NOT_FOUND_IN_REQUEST",
      message: "해당 요청에 속한 추천 코스를 찾을 수 없습니다.",
    });
  }

  const updated = await selectRecommendationForRequest(routeRequestIdx, dto.recommendationIdx);

  if (!updated) {
    logger.error({
      serviceName: "routes",
      action: "selectRouteRecommendation",
      userIdx,
      routeRequestIdx,
      recommendationIdx: dto.recommendationIdx,
    }, "service:failed");

    throw new ApiError({
      status: 409,
      code: "ROUTE_RECOMMENDATION_SELECT_FAILED",
      message: "추천 코스 선택 처리에 실패했습니다.",
    });
  }

  logger.info({
    serviceName: "routes",
    action: "selectRouteRecommendation",
    userIdx,
    routeRequestIdx,
    recommendationIdx: dto.recommendationIdx,
  }, "service:success");

  return {
    requestIdx: updated.idx,
    selectedRecommendationIdx: dto.recommendationIdx,
  };
}

/**
 * 화면 렌더링과 검증에 필요한 추천 코스 상세 데이터를 반환합니다.
 */
export async function getRouteDetail(
  userIdx: number,
  routeRecommendationIdx: number,
): Promise<RouteDetailDTO> {
  logger.info({ serviceName: "routes", action: "getRouteDetail", userIdx, routeRecommendationIdx }, "service:start");

  const [route, points, isBookmarked] = await Promise.all([
    findRouteDetailByIdx(routeRecommendationIdx),
    findRoutePointsByRecommendationIdx(routeRecommendationIdx),
    existsRouteBookmark(userIdx, routeRecommendationIdx),
  ]);

  if (!route) {
    logger.warn({ serviceName: "routes", action: "getRouteDetail", userIdx, routeRecommendationIdx }, "service:route_not_found");

    throw new ApiError({
      status: 404,
      code: "ROUTE_RECOMMENDATION_NOT_FOUND",
      message: "추천 코스를 찾을 수 없습니다.",
    });
  }

  logger.info({
    serviceName: "routes",
    action: "getRouteDetail",
    userIdx,
    routeRecommendationIdx,
    isBookmarked,
  }, "service:success");

  return {
    idx: route.idx,
    name: route.name,
    totalDistance: route.totalDistance,
    totalAscent: route.totalAscent,
    slopeStd: route.slopeStd,
    isBookmarked,
    path: route.path ?? [],
    points,
  };
}
