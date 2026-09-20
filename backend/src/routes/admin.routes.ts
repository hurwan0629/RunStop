import type { Router } from "express";
import { listExplorerRequests, getExplorerRequest, listExplorerRuns, getExplorerUserSummary } from "../controllers/admin-explorer.controller.js";
import { listRuns, getRun, getAnalytics, getRouteRequest } from "../controllers/admin-running.controller.js";

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
  // 관리자 탐색용 읽기 전용 API. 기존 추천·러닝 API는 유지한다.
  router.get("/api/admin/recommendation-requests", authenticate, requireAdmin, asyncHandler(listExplorerRequests));
  router.get("/api/admin/recommendation-requests/:requestIdx", authenticate, requireAdmin, asyncHandler(getExplorerRequest));
  router.get("/api/admin/activity-runs", authenticate, requireAdmin, asyncHandler(listExplorerRuns));
  router.get("/api/admin/user-activity/:userIdx", authenticate, requireAdmin, asyncHandler(getExplorerUserSummary));
  router.get("/api/admin/running-sessions", authenticate, requireAdmin, asyncHandler(listRuns));
  router.get("/api/admin/running-sessions/:sessionIdx", authenticate, requireAdmin, asyncHandler(getRun));
  router.get("/api/admin/running-analytics", authenticate, requireAdmin, asyncHandler(getAnalytics));
  router.get("/api/admin/route-requests/:requestIdx", authenticate, requireAdmin, asyncHandler(getRouteRequest));
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
