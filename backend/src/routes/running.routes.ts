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
 * 러닝 세션, 트랙포인트 기록, 페이스 분석 라우터를 등록합니다.
 *
 * 라우터 그룹:
 * - GET /api/running-sessions
 * - POST /api/running-sessions
 * - POST /api/running-sessions/:sessionIdx/trackpoints
 * - POST /api/running-sessions/:sessionIdx/finish
 * - GET /api/running-sessions/:sessionIdx/pace
 */
export function registerRunningRoutes(router: Router): void {

  // // // // // // // // // [ 생명주기 관련 ] // // // // // // // // // 
  // 해당 단계는 항상 이전 세션이 종료되어야 다음 단계가 시작될 수 있습니다.
  //    # 경우에 따라 /stop 요청을 이용하여 프론트가 강제로 기존 세션들을 정리하게 해야할 수 있습니다. 
  //
  // 2026-09-02 14:47:07 검수 [x] (시작)
  router.post("/api/running-sessions", authenticate, asyncHandler(startRunningSession));
  // 2026-09-02 14:55:55 검수 [x] (주기별로 저장)
  router.post("/api/running-sessions/:sessionIdx/trackpoints", authenticate, asyncHandler(saveRunningTrackpoints));
  // 2026-09-02 15:15:19 검수 [x] (종료)
  router.post("/api/running-sessions/:sessionIdx/finish", authenticate, asyncHandler(finishRunningSession));
  
  // // // // // // // // // [     조회     ] // // // // // // // // // 
  // 2026-09-02 15:43:59 검수 [x] 사용자 러닝 기록(세션) 목록
  router.get("/api/running-sessions", authenticate, asyncHandler(listRunningSessions));
  // 2026-09-02 15:48:25 검수 [x] 사용자 러닝 페이스 조회 (sessionIdx로)
  router.get("/api/running-sessions/:sessionIdx/pace", authenticate, asyncHandler(getRunningPace));
}
