import type { Router } from "express";
import {
  finishRunningSession,
  getRunningPace,
  listRunningSessions,
  saveRunningTrackpoints,
  startRunningSession,
} from "../controllers/running.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

/**
 * 러닝 세션, 트랙포인트, 기록, 페이스 분석 라우트를 등록합니다.
 *
 * 라우트 그룹:
 * - GET /api/running-sessions
 * - POST /api/running-sessions/start
 * - POST /api/running-sessions/trackpoints
 * - POST /api/running-sessions/finish
 * - GET /api/running-sessions/:sessionIdx/pace
 */
export function registerRunningRoutes(router: Router): void {
  router.get("/api/running-sessions", authenticate, asyncHandler(listRunningSessions));
  router.post("/api/running-sessions/start", authenticate, asyncHandler(startRunningSession));
  router.post("/api/running-sessions/trackpoints", authenticate, asyncHandler(saveRunningTrackpoints));
  router.post("/api/running-sessions/finish", authenticate, asyncHandler(finishRunningSession));
  router.get("/api/running-sessions/:sessionIdx/pace", authenticate, asyncHandler(getRunningPace));
}
