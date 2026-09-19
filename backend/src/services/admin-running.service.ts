import { ApiError } from "../middleware/error.js";
import { findSessionOwner } from "../repositories/admin-running.repository.js";
import { findRouteRequestByIdxAndUserIdx } from "../repositories/route-requests.repository.js";
import { findRouteDetailByIdx, findRouteRecommendationsByRequestIdx } from "../repositories/route-recommendations.repository.js";
import { recordedRouteSchema } from "../dto/running/running-detail.dto.js";
import { getRunningDetail } from "./running-detail.service.js";

export async function getAdminRunningDetail(sessionIdx: number) {
  const userIdx = await findSessionOwner(sessionIdx);
  if (userIdx === null) {
    throw new ApiError({ status: 404, code: "RUNNING_SESSION_NOT_FOUND", message: "러닝 기록을 찾을 수 없습니다." });
  }
  const detail = await getRunningDetail(userIdx, sessionIdx);
  if (!detail.route) return { ...detail, request: null, alternatives: [] };

  // 해당 러닝의 선택 코스와 같은 요청에 속한 추천만 비교한다.
  const request = await findRouteRequestByIdxAndUserIdx(detail.route.routeRequestIdx, userIdx);
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
