import type { Router } from "express";
import {
  getRouteDetail,
  recommendRoutes,
  selectRouteRecommendation,
} from "../controllers/routes.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

/**
 * 코스 추천 및 경로 상세 라우트를 등록합니다.
 *
 * 라우트 그룹:
 * - POST /api/routes/recommend
 * - POST /api/routes/:requestIdx/select
 * - GET /api/routes/:routeIdx
 */
export function registerRouteRecommendationRoutes(router: Router): void {
  // // // // // // // // // [ 경로 요청부터 선택까지 ] // // // // // // // // // 
  //      # env.WORKER_MODE 를 monk/http 중에 하나로 설정이 가능하며 [2026-09-02 20:01:41] 기준 monk로 설정되었습니다.
  // 
  // 1. [사용자의 요청] -> [파이썬 워커로 계산 요청] -> [계산 후 요청(request)/request_point/route_recommendation의 메타데이터 트랜잭션 저장] -> 3가지 후보 전송 
  // 2. [후보경로 상세 조회] -> [해당 route_recommendation.idx 의 상세 정보 보여주기] 
  // 3. [사용자의 경로 선택] -> [선택 정보 저장]
  
  // 2026-09-02 20:09:48 검수 [x]
  router.post("/api/routes/recommend", authenticate, asyncHandler(recommendRoutes));

  // 2026-09-02 20:54:56 검수 [x]
  router.get("/api/routes/:routeIdx", authenticate, asyncHandler(getRouteDetail));
  
  // 2026-09-02 21:07:26 검수 [x]
  router.post("/api/routes/:requestIdx/select", authenticate, asyncHandler(selectRouteRecommendation));
}