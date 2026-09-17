import type { Router } from "express";
import { getMyPage, updateMe, withdrawMe } from "../controllers/users.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

/**
 * 현재 사용자 프로필 및 계정 생명주기 라우트를 등록합니다.
 *
 * 라우트 그룹:
 * - GET /api/users/me/mypage
 * - PATCH /api/users/me
 * - DELETE /api/users/me
 */
export function registerUsersRoutes(router: Router): void {

  // 2026-09-02 12:43:53 검수 [x]
  router.get("/api/users/me/mypage", authenticate, asyncHandler(getMyPage));
  
  // 2026-09-02 14:02:50 검수 (runningSettings json은 파이썬 설계 후 마지막에 채우기)
  router.patch("/api/users/me", authenticate, asyncHandler(updateMe));
  
  // 2026-09-02 14:04:12 검수 [x]
  router.delete("/api/users/me", authenticate, asyncHandler(withdrawMe));
}
