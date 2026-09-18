import { getRouteConditionLlmClient, generateRouteNames } from "../adapters/llm/llm.client.js";
import type { ParsedRouteConditions } from "../adapters/llm/llm.client.js";
import { requestRouteRecommendations } from "../adapters/worker/routing-worker.client.js";
import type { RouteDetailDTO } from "../dto/route/route-detail.dto.js";
import { routeFacilityPointsSchema, routeMapLayersSchema } from "../dto/route/route-detail.dto.js";
import type {
  RouteRecommendResponseDTO,
  RouteRecommendationDTO,
  RouteSlopeProfileDTO,
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


function readSlopeProfile(
  featureValues: Record<string, unknown> | null,
): RouteSlopeProfileDTO | null {
  const value = featureValues?.slope;

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const profile = value as Record<string, unknown>;

  const numberOrNull = (field: string): number | null => {
    const candidate = profile[field];

    return typeof candidate === "number" && Number.isFinite(candidate)
      ? candidate
      : null;
  };

  const sampleCount = profile.sampleCount;

  if (
    typeof sampleCount !== "number"
    || !Number.isInteger(sampleCount)
    || sampleCount < 0
  ) {
    return null;
  }

  return {
    avgSlopePct: numberOrNull("avgSlopePct"),
    maxSlopePct: numberOrNull("maxSlopePct"),
    slopeStdPct: numberOrNull("slopeStdPct"),
    elevationGainM: numberOrNull("elevationGainM"),
    elevationLossM: numberOrNull("elevationLossM"),
    sampleCount,
  };
}

type FacilityStatus = "MET" | "RELAXED" | "IGNORE";

function readFacilityCount(
  featureValues: Record<string, unknown> | null,
  key: "toilet" | "store",
) {
  const value = featureValues?.[`${key}_count`];

  return typeof value === "number"
    && Number.isInteger(value)
    && value >= 0
    ? value
    : 0;
}

function readFacilityStatus(
  featureValues: Record<string, unknown> | null,
  key: "toilet" | "store",
): FacilityStatus {
  const statusValues = featureValues?.facilityStatus;

  if (!statusValues || typeof statusValues !== "object") {
    return "IGNORE";
  }

  const value = (statusValues as Record<string, unknown>)[key];

  return value === "MET" || value === "RELAXED" || value === "IGNORE"
    ? value
    : "IGNORE";
}

function readFacilitySummary(
  featureValues: Record<string, unknown> | null,
) {
  return {
    toilet: {
      count: readFacilityCount(featureValues, "toilet"),
      status: readFacilityStatus(featureValues, "toilet"),
    },
    store: {
      count: readFacilityCount(featureValues, "store"),
      status: readFacilityStatus(featureValues, "store"),
    },
  };
}

// 0.15: 경로 주변 버퍼의 15% 이상이어야지 코스 이름에 하천이나 공원 이름을 씀
const LANDMARK_MIN_RATIO = 0.15;

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readVerifiedLandmarks(
  featureValues: Record<string, unknown> | null,
): string[] {
  const natureValue = featureValues?.nature;

  if (
    !natureValue
    || typeof natureValue !== "object"
    || Array.isArray(natureValue)
  ) {
    return [];
  }

  const nature = natureValue as Record<string, unknown>;
  const waterRatio = readNumber(nature.waterRatio) ?? 0;
  const parkRatio = readNumber(nature.parkRatio) ?? 0;
  const waterNames = readStringArray(nature.waterNames);
  const parkNames = readStringArray(nature.parkNames);

  const landmarks: string[] = [];

  if (waterRatio >= LANDMARK_MIN_RATIO) {
    landmarks.push(...waterNames.slice(0, 1));
  }

  if (parkRatio >= LANDMARK_MIN_RATIO) {
    landmarks.push(...parkNames.slice(0, 1));
  }

  return [...new Set(landmarks)];
}

function readRecord(
  featureValues: Record<string, unknown> | null,
  key: string,
): Record<string, unknown> {
  const value = featureValues?.[key];

  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readNatureSummary(
  featureValues: Record<string, unknown> | null,
) {
  const nature = readRecord(featureValues, "nature");

  return {
    parkRatio: readNumber(nature.parkRatio),
    waterRatio: readNumber(nature.waterRatio),
    parkNames: readStringArray(nature.parkNames).slice(0, 2),
    waterNames: readStringArray(nature.waterNames).slice(0, 2),
  };
}

function readSurfaceSummary(
  featureValues: Record<string, unknown> | null,
) {
  const surface = readRecord(featureValues, "surface");

  return {
    walkableRatio: readNumber(surface.walkable_ratio),
    bigroadRatio: readNumber(surface.bigroad_ratio),
    stairsCount: readNumber(surface.stairs_count),
    signalPerKm: readNumber(surface.signal_per_km),
    crossingPerKm: readNumber(surface.crossing_per_km),
  };
}

function readSlopeConstraint(
  featureValues: Record<string, unknown> | null,
) {
  const slopeConstraint = readRecord(featureValues, "slopeConstraint");
  const status = slopeConstraint.status;
  const normalizedStatus: FacilityStatus =
    status === "MET" || status === "RELAXED" || status === "IGNORE"
      ? status
      : "IGNORE";

  return {
    requestedMaxSlopePct: readNumber(slopeConstraint.requestedMaxSlopePct),
    appliedMaxSlopePct: readNumber(slopeConstraint.appliedMaxSlopePct),
    status: normalizedStatus,
  };
}

function readFeatureScores(
  featureScores: Record<string, number | null>,
): Record<string, number | null> {
  return Object.fromEntries(
    Object.entries(featureScores)
      .filter(([, value]) => value === null || Number.isFinite(value))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
}

function toRouteRecommendationDTO(row: {
  idx: number;
  name: string;
  score: number | null;
  totalDistance: number | null;
  totalAscent: number | null;
  slopeStd: number | null;
  featureValues: Record<string, unknown> | null;
  featureScores: Record<string, number> | null;
}): RouteRecommendationDTO {
  return {
    idx: row.idx,
    name: row.name,
    score: row.score,
    totalDistance: row.totalDistance,
    totalAscent: row.totalAscent,
    slopeStd: row.slopeStd,
    slope: readSlopeProfile(row.featureValues),
    featureScores: row.featureScores ?? {},
    facilities: readFacilitySummary(row.featureValues),
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
  let parsedConditions: ParsedRouteConditions;

  try {
    parsedConditions = await getRouteConditionLlmClient().parseRouteConditions({
      prompt: dto.prompt,
      targetDistance: dto.elementConditions.targetDistance,
    });
  } catch (error) {
    logger.warn(
      {
        serviceName: "routes",
        action: "applyLlmRouteConditions",
        err: error,
      },
      "service:llm_condition_parse_failed",
    );

    return dto;
  }

  return {
    ...dto,
    // 기존 데이터에 elementConditions를 넣어줍니다.
    elementConditions: {
      // 기존의 데이터를 넣고
      ...dto.elementConditions,
      weights: {
        ...parsedConditions.weights,
        ...dto.elementConditions.weights,
      },
      requirements: dto.elementConditions.requirements,
    },
  };
}

const MAX_RECOMMENDATION_COUNT = 3;

/**
 * 사용자가 고른 경사 기준을 우선 적용하되, 후보가 부족할 때만 단계적으로 완화한다.
 * 예: 완만(5%) -> 8% -> 제한 없음
 */
function getSlopeFallbackLimits(
  requestedMaxSlope: number | undefined,
): Array<number | undefined> {
  const limits =
    requestedMaxSlope === undefined
      ? [undefined]
      : requestedMaxSlope <= 5
        ? [requestedMaxSlope, 8, undefined]
        : requestedMaxSlope <= 8
          ? [requestedMaxSlope, 12, undefined]
          : [requestedMaxSlope, undefined];

  return limits.filter(
    (limit, index) => limits.indexOf(limit) === index,
  );
}

/** 같은 경로가 완화 단계에서 다시 반환되면 한 번만 유지한다. */
function getCandidateFingerprint(candidate: WorkerRouteCandidateDTO): string {
  return candidate.path
    .map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`)
    .join("|");
}

/**
 * DB의 feature_values에 경사 조건이 엄격히 충족됐는지,
 * 후보 확보를 위해 완화됐는지를 함께 저장한다.
 */
function withSlopeFallbackStatus(
  candidate: WorkerRouteCandidateDTO,
  requestedMaxSlope: number | undefined,
  appliedMaxSlope: number | undefined,
): WorkerRouteCandidateDTO {
  const status =
    requestedMaxSlope === undefined
      ? "IGNORE"
      : requestedMaxSlope === appliedMaxSlope
        ? "MET"
        : "RELAXED";

  return {
    ...candidate,
    featureValues: {
      ...candidate.featureValues,
      slopeConstraint: {
        requestedMaxSlopePct: requestedMaxSlope ?? null,
        appliedMaxSlopePct: appliedMaxSlope ?? null,
        status,
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
  const llmConditionStartedAt = Date.now();
  if (dto.prompt) {
    logger.info({
      serviceName: "routes",
      action: "recommendRoutes",
      userIdx,
      promptLength: dto.prompt.length,
      targetDistance: dto.elementConditions.targetDistance,
    }, "service:llm_condition_parse:start");
  } else {
    logger.info({
      serviceName: "routes",
      action: "recommendRoutes",
      userIdx,
    }, "service:llm_condition_parse:skip");
  }

  const routeRequest = await applyLlmRouteConditions(dto);
  
  if (dto.prompt) {
    logger.info({
      serviceName: "routes",
      action: "recommendRoutes",
      userIdx,
      durationMs: Date.now() - llmConditionStartedAt,
    }, "service:llm_condition_parse:success");
  }

  // // // // // // // // // // // // // // // // //
  //       2. Python routing-worker를 호출합니다.   //
  // // // // // // // // // // // // // // // // //
  const endPoint = routeRequest.endPoint ?? routeRequest.startPoint;
  const requestedMaxSlope = routeRequest.elementConditions.maxSlope;
  const slopeFallbackLimits = getSlopeFallbackLimits(requestedMaxSlope);
  const collectedCandidates: WorkerRouteCandidateDTO[] = [];
  const seenCandidateKeys = new Set<string>();

  try {
    // 경사도 조건을 완화하면서 필요한 후보 수까지 반복 요청
    for (const appliedMaxSlope of slopeFallbackLimits) {
      if (collectedCandidates.length >= MAX_RECOMMENDATION_COUNT) {
        break;
      }

      const workerRequestStartedAt = Date.now();
      const collectedBeforeRequest = collectedCandidates.length;
      const attemptNumber = slopeFallbackLimits.indexOf(appliedMaxSlope) + 1;

      // 워커 요청 시작 로그
      logger.info(
        {
          serviceName: "routes",
          action: "recommendRoutes",
          userIdx,
          attemptNumber,
          attemptCount: slopeFallbackLimits.length,
          requestedMaxSlope: requestedMaxSlope ?? null,
          appliedMaxSlope: appliedMaxSlope ?? null,
          collectedCandidateCount: collectedBeforeRequest,
        },
        "service:worker_request:start",
      );

      // 현재 경사도 조건으로 경로 후보 생성 요청
      const phaseResponse = await requestRouteRecommendations({
        startPoint: routeRequest.startPoint,
        waypoints: routeRequest.waypoints,
        endPoint,
        routeType: routeRequest.routeType,
        prompt: routeRequest.prompt,
        elementConditions: {
          ...routeRequest.elementConditions,
          maxSlope: appliedMaxSlope,
        },
        maxCandidates: MAX_RECOMMENDATION_COUNT,
      });

      // 워커 응답 시간과 후보 수 기록
      logger.info(
        {
          serviceName: "routes",
          action: "recommendRoutes",
          userIdx,
          attemptNumber,
          attemptCount: slopeFallbackLimits.length,
          requestedMaxSlope: requestedMaxSlope ?? null,
          appliedMaxSlope: appliedMaxSlope ?? null,
          responseCandidateCount: phaseResponse.candidates.length,
          durationMs: Date.now() - workerRequestStartedAt,
        },
        "service:worker_response:received",
      );

      // 중복 후보를 제거한 뒤 최종 후보 목록에 추가
      for (const candidate of phaseResponse.candidates) {
        const candidateKey = getCandidateFingerprint(candidate);

        if (seenCandidateKeys.has(candidateKey)) {
          continue;
        }

        seenCandidateKeys.add(candidateKey);

        collectedCandidates.push(
          withSlopeFallbackStatus(
            candidate,
            requestedMaxSlope,
            appliedMaxSlope,
          ),
        );

        if (collectedCandidates.length >= MAX_RECOMMENDATION_COUNT) {
          break;
        }
      }

      // 이번 요청에서 실제 추가된 후보 수 기록
      logger.info(
        {
          serviceName: "routes",
          action: "recommendRoutes",
          userIdx,
          attemptNumber,
          attemptCount: slopeFallbackLimits.length,
          requestedMaxSlope: requestedMaxSlope ?? null,
          appliedMaxSlope: appliedMaxSlope ?? null,
          responseCandidateCount: phaseResponse.candidates.length,
          addedCandidateCount:
            collectedCandidates.length - collectedBeforeRequest,
          collectedCandidateCount: collectedCandidates.length,
        },
        "service:worker_request:success",
      );
    }
  } catch (error) {
    // 워커 요청 중 발생한 오류 기록 후 상위로 전달
    logger.error(
      {
        serviceName: "routes",
        action: "recommendRoutes",
        userIdx,
        err: error,
      },
      "service:worker_request:error",
    );

    throw error;
  }

  // 모든 시도 후에도 후보가 없으면 추천 실패 처리
  if (collectedCandidates.length === 0) {
    throw new ApiError({
      status: 422,
      code: "ROUTE_CANDIDATES_NOT_FOUND",
      message: "입력한 조건으로 추천 코스를 찾지 못했습니다.",
    });
  }

  const workerResponse = {
    candidates: collectedCandidates,
  };

  let candidatesForSave = workerResponse.candidates;

  // // // // // // // // // // // // // // // // //
  //       3. LLM으로 추천 경로명을 생성합니다.      //
  // // // // // // // // // // // // // // // // //
  try {
    const routeNameStartedAt = Date.now();
    logger.info({
      serviceName: "routes",
      action: "recommendRoutes",
      userIdx,
      candidateCount: workerResponse.candidates.length,
    }, "service:route_name_generation:start");

    const nightRequested =
      (routeRequest.elementConditions.weights.night ?? 0) >= 4;

    // 실제로 llm 을 호출하는 부분입니다.
    const namingResult = await generateRouteNames({
      prompt: routeRequest.prompt ?? null,
      weights: routeRequest.elementConditions.weights,
      facilityPreferences: routeRequest.elementConditions.facilityPreferences,
      candidates: workerResponse.candidates.map(
        (candidate, candidateIndex) => {
          const slope = readSlopeProfile(candidate.featureValues);
          const nightScore = readNumber(candidate.featureScores.night);

          return {
            candidateIndex,
            routeType: routeRequest.routeType,
            distanceKm:
              candidate.totalDistance !== null
                ? candidate.totalDistance / 1000
                : routeRequest.elementConditions.targetDistance / 1000,
            featureScores: readFeatureScores(candidate.featureScores),
            verifiedLandmarks: readVerifiedLandmarks(
              candidate.featureValues,
            ),
            nature: readNatureSummary(candidate.featureValues),
            facilities: readFacilitySummary(candidate.featureValues),
            surface: readSurfaceSummary(candidate.featureValues),
            nightRequested,
            nightScore,
            elevationGainM: slope?.elevationGainM ?? null,
            maxSlopePct: slope?.maxSlopePct ?? null,
            slopeConstraint: readSlopeConstraint(candidate.featureValues),
          };
        },
      ),
    });

    const nameByCandidateIndex = new Map(
      namingResult.names.map((item) => [
        item.candidateIndex,
        item.name,
      ]),
    );

    candidatesForSave = workerResponse.candidates.map(
      (candidate, candidateIndex) => ({
        ...candidate,
        name:
          nameByCandidateIndex.get(candidateIndex) ?? candidate.name,
      }),
    );

    logger.info({
      serviceName: "routes",
      action: "recommendRoutes",
      userIdx,
      generatedNameCount: namingResult.names.length,
      durationMs: Date.now() - routeNameStartedAt,
    }, "service:route_name_generation:success");
  } catch (error) {
    logger.warn(
      {
        serviceName: "routes",
        action: "recommendRoutes",
        err: error,
      },
      "service:route_name_generation_failed",
    );
  }
  // // // // // // // // // // // // // // // // //
  //       4. Database에 추천 결과를 저장합니다.    //
  // // // // // // // // // // // // // // // // //
  // 워커로부터 응답이 문제 없이 받아졋다면 그대로 다음 3각지 요소를 저장합니다.
  // 1. 사용자 요청
  // 2. 사용자 요청에 포함된 주요 route_points
  // 3. 파이썬 워커의 응답
  const dbSaveStartedAt = Date.now();
  const saved = await withTransaction(async (client) => {
    const savedRouteRequest = await createRouteRequest({
      userIdx,
      prompt: routeRequest.prompt,
      elementConditions: routeRequest.elementConditions,
      routeType: routeRequest.routeType,
    }, client);

    await createRouteRequestPoints(savedRouteRequest.idx, buildRouteRequestPoints(routeRequest), client);

    const recommendations = await createRouteRecommendations(
      savedRouteRequest.idx,
      candidatesForSave,
      client,
    );

    for (const [index, recommendation] of recommendations.entries()) {
      const candidate = candidatesForSave[index];
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
    durationMs: Date.now() - dbSaveStartedAt,
  }, "service:database_save:success");

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


  // 사용자 요청이 존재하거나 이미 선택한 것을 걸러내기 위해 경로 요청을 뽑기
  const routeRequest = await findRouteRequestByIdxAndUserIdx(routeRequestIdx, userIdx);

  if (!routeRequest) {
    logger.warn({ serviceName: "routes", action: "selectRouteRecommendation", userIdx, routeRequestIdx }, "service:route_request_not_found");

    throw new ApiError({
      status: 404,
      code: "ROUTE_REQUEST_NOT_FOUND",
      message: "경로 추천 요청을 찾을 수 없습니다.",
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

  if (routeRequest.selectedRecommendationIdx !== null) {
    if (routeRequest.selectedRecommendationIdx === dto.recommendationIdx) {
      logger.info({
        serviceName: "routes",
        action: "selectRouteRecommendation",
        userIdx,
        routeRequestIdx,
        recommendationIdx: dto.recommendationIdx,
      }, "service:already_selected_same_recommendation");

      return {
        requestIdx: routeRequest.idx,
        selectedRecommendationIdx: dto.recommendationIdx,
      };
    }

    logger.warn({
      serviceName: "routes",
      action: "selectRouteRecommendation",
      userIdx,
      routeRequestIdx,
      selectedRecommendationIdx: routeRequest.selectedRecommendationIdx,
      recommendationIdx: dto.recommendationIdx,
    }, "service:route_request_already_selected");

    throw new ApiError({
      status: 409,
      code: "ROUTE_REQUEST_ALREADY_SELECTED",
      message: "이미 다른 추천 코스를 선택한 요청입니다.",
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
    slope: readSlopeProfile(route.featureValues),
    isBookmarked,
    path: route.path ?? [],
    points,
    facilityPoints: routeFacilityPointsSchema.parse(route.featureValues?.facilityPoints),
    mapLayers: routeMapLayersSchema.parse(route.featureValues?.mapLayers),
  };
}
