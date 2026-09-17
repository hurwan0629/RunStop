import type { RouteBookmarkDTO } from "../dto/route/point-bookmark.dto.js";
import type {
  BookmarkListQueryDTO,
  DeleteBookmarkResponseDTO,
  PointBookmarkDTO,
  PointBookmarkListResponseDTO,
  PointBookmarkResponseDTO,
} from "../dto/route/route-bookmark.dto.js";
import { logger } from "../logging/logger.js";
import { ApiError } from "../middleware/error.js";
import {
  createPointBookmark as createPointBookmarkRepository,
  createRouteBookmark as createRouteBookmarkRepository,
  deletePointBookmarkByIdxAndUserIdx,
  deleteRouteBookmarkByIdxAndUserIdx,
  findPointBookmarksByUserIdx,
  findRouteBookmarksByUserIdx,
} from "../repositories/bookmarks.repository.js";
import { findRouteRecommendationByIdx } from "../repositories/route-recommendations.repository.js";

/**
 * 현재 사용자가 저장한 장소 즐겨찾기를 반환합니다.
 */
export async function listPointBookmarks(
  userIdx: number,
  query: BookmarkListQueryDTO,
): Promise<PointBookmarkListResponseDTO> {
  logger.info({ serviceName: "bookmarks", action: "listPointBookmarks", userIdx, page: query.page, limit: query.limit }, "service:start");

  const items = await findPointBookmarksByUserIdx(userIdx, query);

  logger.info({ serviceName: "bookmarks", action: "listPointBookmarks", userIdx, itemCount: items.length }, "service:success");

  return {
    items,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * 현재 사용자의 장소 즐겨찾기를 생성합니다.
 */
export async function createPointBookmark(
  userIdx: number,
  dto: PointBookmarkDTO,
): Promise<PointBookmarkResponseDTO> {
  logger.info({ serviceName: "bookmarks", action: "createPointBookmark", userIdx }, "service:start");

  const bookmark = await createPointBookmarkRepository({
    userIdx,
    name: dto.name,
    point: dto.point,
  });

  logger.info({
    serviceName: "bookmarks",
    action: "createPointBookmark",
    userIdx,
    bookmarkIdx: bookmark.bookmarkIdx,
  }, "service:success");

  return bookmark;
}

/**
 * 현재 사용자의 장소 즐겨찾기를 삭제합니다.
 */
export async function deletePointBookmark(
  userIdx: number,
  bookmarkIdx: number,
): Promise<DeleteBookmarkResponseDTO> {
  logger.info({ serviceName: "bookmarks", action: "deletePointBookmark", userIdx, bookmarkIdx }, "service:start");

  const deleted = await deletePointBookmarkByIdxAndUserIdx(bookmarkIdx, userIdx);

  if (!deleted) {
    logger.warn({ serviceName: "bookmarks", action: "deletePointBookmark", userIdx, bookmarkIdx }, "service:bookmark_not_found");

    throw new ApiError({
      status: 404,
      code: "POINT_BOOKMARK_NOT_FOUND",
      message: "장소 즐겨찾기를 찾을 수 없습니다.",
    });
  }

  logger.info({ serviceName: "bookmarks", action: "deletePointBookmark", userIdx, bookmarkIdx }, "service:success");

  return {
    deleted: true,
  };
}

/**
 * 현재 사용자가 저장한 코스 즐겨찾기를 반환합니다.
 */
export async function listRouteBookmarks(
  userIdx: number,
  query: BookmarkListQueryDTO,
) {
  logger.info({ serviceName: "bookmarks", action: "listRouteBookmarks", userIdx, page: query.page, limit: query.limit }, "service:start");

  const items = await findRouteBookmarksByUserIdx(userIdx, query);

  logger.info({ serviceName: "bookmarks", action: "listRouteBookmarks", userIdx, itemCount: items.length }, "service:success");

  return {
    items,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * 현재 사용자의 코스 즐겨찾기를 생성합니다.
 */
export async function createRouteBookmark(
  userIdx: number,
  dto: RouteBookmarkDTO,
) {
  logger.info({
    serviceName: "bookmarks",
    action: "createRouteBookmark",
    userIdx,
    recommendationId: dto.recommendationId,
  }, "service:start");

  const recommendation = await findRouteRecommendationByIdx(dto.recommendationId);

  if (!recommendation) {
    logger.warn({
      serviceName: "bookmarks",
      action: "createRouteBookmark",
      userIdx,
      recommendationId: dto.recommendationId,
    }, "service:route_recommendation_not_found");

    throw new ApiError({
      status: 404,
      code: "ROUTE_RECOMMENDATION_NOT_FOUND",
      message: "추천 코스를 찾을 수 없습니다.",
    });
  }

  try {
    const bookmark = await createRouteBookmarkRepository(userIdx, dto.recommendationId);

    logger.info({
      serviceName: "bookmarks",
      action: "createRouteBookmark",
      userIdx,
      bookmarkIdx: bookmark.bookmarkIdx,
      routeRecommendationIdx: bookmark.routeRecommendationIdx,
    }, "service:success");

    return bookmark;
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "23505"
    ) {
      logger.warn({
        serviceName: "bookmarks",
        action: "createRouteBookmark",
        userIdx,
        recommendationId: dto.recommendationId,
      }, "service:route_bookmark_already_exists");

      throw new ApiError({
        status: 409,
        code: "ROUTE_BOOKMARK_ALREADY_EXISTS",
        message: "이미 즐겨찾기한 코스입니다.",
      });
    }

    throw error;
  }
}

/**
 * 현재 사용자의 코스 즐겨찾기를 삭제합니다.
 */
export async function deleteRouteBookmark(
  userIdx: number,
  bookmarkIdx: number,
): Promise<DeleteBookmarkResponseDTO> {
  logger.info({ serviceName: "bookmarks", action: "deleteRouteBookmark", userIdx, bookmarkIdx }, "service:start");

  const deleted = await deleteRouteBookmarkByIdxAndUserIdx(bookmarkIdx, userIdx);

  if (!deleted) {
    logger.warn({ serviceName: "bookmarks", action: "deleteRouteBookmark", userIdx, bookmarkIdx }, "service:bookmark_not_found");

    throw new ApiError({
      status: 404,
      code: "ROUTE_BOOKMARK_NOT_FOUND",
      message: "코스 즐겨찾기를 찾을 수 없습니다.",
    });
  }

  logger.info({ serviceName: "bookmarks", action: "deleteRouteBookmark", userIdx, bookmarkIdx }, "service:success");

  return {
    deleted: true,
  };
}
