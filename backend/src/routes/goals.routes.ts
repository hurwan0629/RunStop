import type { Router } from "express";
import { createGoal, getCurrentGoal, stopGoal } from "../controllers/goals.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

/**
 * 주간/월간 러닝 목표 라우트를 등록합니다.
 *
 * 라우트 그룹:
 * - GET /api/goals/current
 * - POST /api/goals
 * - POST /api/goals/:goalIdx/stop
 */
export function registerGoalsRoutes(router: Router): void {
  router.get("/api/goals/current", authenticate, asyncHandler(getCurrentGoal));
  router.post("/api/goals", authenticate, asyncHandler(createGoal));
  router.post("/api/goals/:goalIdx/stop", authenticate, asyncHandler(stopGoal));
}
