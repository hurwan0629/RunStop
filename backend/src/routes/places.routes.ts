import type { Router } from "express";
import { searchPlaces } from "../controllers/places.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate } from "../middleware/auth.js";

/**
 * 장소 검색 라우트를 등록합니다.
 *
 * GET /api/places/search?query=서울숲
 */
export function registerPlacesRoutes(router: Router): void {
  router.get(
    "/api/places/search",
    authenticate,
    asyncHandler(searchPlaces),
  );
}