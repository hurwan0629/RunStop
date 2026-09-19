import { ApiError } from "../middleware/error.js";
import { findSessionOwner } from "../repositories/admin-running.repository.js";
import { findRouteRequestByIdxAndUserIdx, findRouteRequestOwner, findRouteRequestPoints } from "../repositories/route-requests.repository.js";
import { findRouteDetailByIdx, findRouteRecommendationsByRequestIdx } from "../repositories/route-recommendations.repository.js";
import { recordedRouteSchema, recordedRequestSchema } from "../dto/running/running-detail.dto.js";
import { getRunningDetail } from "./running-detail.service.js";

export async function getAdminRunningDetail(sessionIdx: number) {
  const userIdx = await findSessionOwner(sessionIdx);
  if (userIdx === null) {
    throw new ApiError({ status: 404, code: "RUNNING_SESSION_NOT_FOUND", message: "러닝 기록을 찾을 수 없습니다." });
  }
  const detail = await getRunningDetail(userIdx, sessionIdx);
  if (!detail.route) return { ...detail, request: null, alternatives: [] };

  // 해당 러닝의 선택 코스와 같은 요청에 속한 추천만 비교한다.
  const request = detail.request;
  if (!request) return { ...detail, request: null, alternatives: [] };
  const recommendations = await findRouteRecommendationsByRequestIdx(request.idx);
  const alternatives = await Promise.all(recommendations
    .filter(route => route.idx !== detail.route!.idx)
    .map(route => findRouteDetailByIdx(route.idx)));

  return {
    ...detail, request,
    alternatives: alternatives.filter(route => route !== null)
      .map(route => recordedRouteSchema.parse({ ...route, path: route.path ?? [] })),
  };
}

export async function getAdminRouteRequestDetail(requestIdx: number) {
  const owner = await findRouteRequestOwner(requestIdx);
  const request = owner === null ? null : await findRouteRequestByIdxAndUserIdx(requestIdx, owner);
  if (!request) {
    throw new ApiError({ status: 404, code: "ROUTE_REQUEST_NOT_FOUND", message: "추천 요청을 찾을 수 없습니다." });
  }
  const [points, recommendations] = await Promise.all([
    findRouteRequestPoints(requestIdx), findRouteRecommendationsByRequestIdx(requestIdx),
  ]);
  return {
    request: recordedRequestSchema.parse({ ...request, points }),
    // 비교 표에는 geometry가 필요 없다. 기존 조회 결과와 feature_values만 재사용한다.
    recommendations: recommendations.map(route => recordedRouteSchema.parse({ ...route, path: [] })),
  };
}
