import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  routeBookmarkCreateResponseSchema,
  routeBookmarkListResponseSchema,
  routeBookmarkSchema,
} from "../dto/route/point-bookmark.dto.js";
import {
  bookmarkListQuerySchema,
  deleteBookmarkResponseSchema,
  pointBookmarkListResponseSchema,
  pointBookmarkResponseSchema,
  pointBookmarkSchema,
} from "../dto/route/route-bookmark.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  createPointBookmark as createPointBookmarkService,
  createRouteBookmark as createRouteBookmarkService,
  deletePointBookmark as deletePointBookmarkService,
  deleteRouteBookmark as deleteRouteBookmarkService,
  listPointBookmarks as listPointBookmarksService,
  listRouteBookmarks as listRouteBookmarksService,
} from "../services/bookmarks.service.js";

const bookmarkParamsSchema = z.object({
  bookmarkIdx: z.coerce.number().int().positive(),
});

function getAuthenticatedUserIdx(req: Request): number {
  if (!req.user) {
    throw new ApiError({
      status: 401,
      code: "UNAUTHORIZED",
      message: "인증이 필요합니다.",
    });
  }

  return req.user.idx;
}

function parseBookmarkIdx(req: Request): number {
  const parseResult = bookmarkParamsSchema.safeParse(req.params);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_BOOKMARK_PARAMS",
      message: "즐겨찾기 경로 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  return parseResult.data.bookmarkIdx;
}

/**
 * 현재 사용자가 저장한 장소 즐겨찾기 목록을 반환합니다.
 */
export async function listPointBookmarks(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = bookmarkListQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_BOOKMARK_LIST_QUERY",
      message: "즐겨찾기 목록 조회 조건이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await listPointBookmarksService(userIdx, parseResult.data);

  res.json({
    success: true,
    data: pointBookmarkListResponseSchema.parse(result),
  });
}

/**
 * 현재 사용자의 장소 즐겨찾기를 생성합니다.
 */
export async function createPointBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = pointBookmarkSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_POINT_BOOKMARK_REQUEST",
      message: "장소 즐겨찾기 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await createPointBookmarkService(userIdx, parseResult.data);

  res.json({
    success: true,
    data: pointBookmarkResponseSchema.parse(result),
  });
}

/**
 * 현재 사용자가 소유한 장소 즐겨찾기를 삭제합니다.
 */
export async function deletePointBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const bookmarkIdx = parseBookmarkIdx(req);
  const result = await deletePointBookmarkService(userIdx, bookmarkIdx);

  res.json({
    success: true,
    data: deleteBookmarkResponseSchema.parse(result),
  });
}

/**
 * 현재 사용자가 저장한 코스 즐겨찾기 목록을 반환합니다.
 */
export async function listRouteBookmarks(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = bookmarkListQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_BOOKMARK_LIST_QUERY",
      message: "즐겨찾기 목록 조회 조건이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await listRouteBookmarksService(userIdx, parseResult.data);

  res.json({
    success: true,
    data: routeBookmarkListResponseSchema.parse(result),
  });
}

/**
 * 현재 사용자의 코스 즐겨찾기를 생성합니다.
 */
export async function createRouteBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const parseResult = routeBookmarkSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_ROUTE_BOOKMARK_REQUEST",
      message: "코스 즐겨찾기 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await createRouteBookmarkService(userIdx, parseResult.data);

  res.json({
    success: true,
    data: routeBookmarkCreateResponseSchema.parse(result),
  });
}

/**
 * 현재 사용자가 소유한 코스 즐겨찾기를 삭제합니다.
 */
export async function deleteRouteBookmark(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userIdx = getAuthenticatedUserIdx(req);
  const bookmarkIdx = parseBookmarkIdx(req);
  const result = await deleteRouteBookmarkService(userIdx, bookmarkIdx);

  res.json({
    success: true,
    data: deleteBookmarkResponseSchema.parse(result),
  });
}
