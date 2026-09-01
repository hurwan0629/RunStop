import type { Request, Response, NextFunction } from "express";

/**
 * 현재 사용자가 저장한 장소 즐겨찾기 목록을 반환합니다.
 */
export function listPointBookmarks(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자의 장소 즐겨찾기를 생성합니다.
 */
export function createPointBookmark(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자가 소유한 장소 즐겨찾기를 삭제합니다.
 */
export function deletePointBookmark(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자가 저장한 코스 즐겨찾기 목록을 반환합니다.
 */
export function listRouteBookmarks(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자의 코스 즐겨찾기를 생성합니다.
 */
export function createRouteBookmark(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자가 소유한 코스 즐겨찾기를 삭제합니다.
 */
export function deleteRouteBookmark(req: Request, res: Response, next: NextFunction): void {
}
