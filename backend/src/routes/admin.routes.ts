import type { Router } from "express";

import {
  getUserDetail,
  listUsers,
  suspendUser,
  updateUserStatus,
  getDashboard,
} from "../controllers/admin.controller.js";

import {
  authenticate,
  requireAdmin,
} from "../middleware/auth.js";

import {
  asyncHandler,
} from "../middleware/async-handler.js";

export function registerAdminRoutes(
  router: Router,
): void {
  /**
   * 관리자 회원 목록 조회
   */
  router.get(
    "/api/admin/users",
    authenticate,
    requireAdmin,
    asyncHandler(listUsers),
  );

  router.get(
  "/api/admin/users/:userIdx",
  authenticate,
  requireAdmin,
  asyncHandler(getUserDetail),
);

  /**
   * 기존 회원 정지
   */
  router.patch(
    "/api/admin/users/suspension",
    authenticate,
    requireAdmin,
    asyncHandler(suspendUser),
  );

  /**
   * 관리자 회원 상태 변경
   */
  router.patch(
    "/api/admin/users/:userIdx/status",
    authenticate,
    requireAdmin,
    asyncHandler(updateUserStatus),
  );

  router.get(
  "/api/admin/dashboard",
  authenticate,
  requireAdmin,
  asyncHandler(getDashboard),
);
}