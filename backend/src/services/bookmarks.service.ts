import type { RouteBookmarkDTO } from "../dto/route/point-bookmark.dto.js";
import type {
  BookmarkListQueryDTO,
  DeleteBookmarkResponseDTO,
  PointBookmarkDTO,
  PointBookmarkListResponseDTO,
  PointBookmarkResponseDTO,
} from "../dto/route/route-bookmark.dto.js";
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
  const items = await findPointBookmarksByUserIdx(userIdx, query);

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
  return createPointBookmarkRepository({
    userIdx,
    name: dto.name,
    point: dto.point,
  });
}

/**
 * 현재 사용자의 장소 즐겨찾기를 삭제합니다.
 */
export async function deletePointBookmark(
  userIdx: number,
  bookmarkIdx: number,
): Promise<DeleteBookmarkResponseDTO> {
  const deleted = await deletePointBookmarkByIdxAndUserIdx(bookmarkIdx, userIdx);

  if (!deleted) {
    throw new ApiError({
      status: 404,
      code: "POINT_BOOKMARK_NOT_FOUND",
      message: "장소 즐겨찾기를 찾을 수 없습니다.",
    });
  }

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
  const items = await findRouteBookmarksByUserIdx(userIdx, query);

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
  const recommendation = await findRouteRecommendationByIdx(dto.recommendationId);

  if (!recommendation) {
    throw new ApiError({
      status: 404,
      code: "ROUTE_RECOMMENDATION_NOT_FOUND",
      message: "추천 코스를 찾을 수 없습니다.",
    });
  }

  try {
    return await createRouteBookmarkRepository(userIdx, dto.recommendationId);
  } catch (error) {
    if (
      typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "23505"
    ) {
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
  const deleted = await deleteRouteBookmarkByIdxAndUserIdx(bookmarkIdx, userIdx);

  if (!deleted) {
    throw new ApiError({
      status: 404,
      code: "ROUTE_BOOKMARK_NOT_FOUND",
      message: "코스 즐겨찾기를 찾을 수 없습니다.",
    });
  }

  return {
    deleted: true,
  };
}
