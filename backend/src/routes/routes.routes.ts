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
  router.post("/api/routes/recommend", authenticate, asyncHandler(recommendRoutes));
  router.post("/api/routes/:requestIdx/select", authenticate, asyncHandler(selectRouteRecommendation));
  router.get("/api/routes/:routeIdx", authenticate, asyncHandler(getRouteDetail));
}
