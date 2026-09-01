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
  router.get("/api/users/me/mypage", authenticate, asyncHandler(getMyPage));
  router.patch("/api/users/me", authenticate, asyncHandler(updateMe));
  router.delete("/api/users/me", authenticate, asyncHandler(withdrawMe));
}
