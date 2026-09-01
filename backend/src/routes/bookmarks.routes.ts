import type { Router } from "express";
import {
  createPointBookmark,
  createRouteBookmark,
  deletePointBookmark,
  deleteRouteBookmark,
  listPointBookmarks,
  listRouteBookmarks,
} from "../controllers/bookmarks.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

/**
 * 장소 즐겨찾기 및 코스 즐겨찾기 라우트를 등록합니다.
 *
 * 라우트 그룹:
 * - GET /api/bookmarks/points
 * - POST /api/bookmarks/points
 * - DELETE /api/bookmarks/points/:bookmarkIdx
 * - GET /api/bookmarks/routes
 * - POST /api/bookmarks/routes
 * - DELETE /api/bookmarks/routes/:bookmarkIdx
 */
export function registerBookmarksRoutes(router: Router): void {
  router.get("/api/bookmarks/points", authenticate, asyncHandler(listPointBookmarks));
  router.post("/api/bookmarks/points", authenticate, asyncHandler(createPointBookmark));
  router.delete("/api/bookmarks/points/:bookmarkIdx", authenticate, asyncHandler(deletePointBookmark));
  router.get("/api/bookmarks/routes", authenticate, asyncHandler(listRouteBookmarks));
  router.post("/api/bookmarks/routes", authenticate, asyncHandler(createRouteBookmark));
  router.delete("/api/bookmarks/routes/:bookmarkIdx", authenticate, asyncHandler(deleteRouteBookmark));
}
