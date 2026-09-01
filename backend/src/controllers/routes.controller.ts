import type { Request, Response, NextFunction } from "express";

/**
 * 경로 추천 요청을 생성하고 워커에 후보 경로 생성을 요청합니다.
 */
export function recommendRoutes(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 이미 생성된 경로 추천 요청에서 하나의 추천 코스를 선택합니다.
 */
export function selectRouteRecommendation(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 추천 코스의 전체 상세 데이터를 반환합니다.
 */
export function getRouteDetail(req: Request, res: Response, next: NextFunction): void {
}
