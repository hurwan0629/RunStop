import type { Request, Response, NextFunction } from "express";

/**
 * 현재 활성 상태인 주간 또는 월간 러닝 목표를 반환합니다.
 */
export function getCurrentGoal(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 새 주간 또는 월간 러닝 목표를 생성합니다.
 */
export function createGoal(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자의 활성 러닝 목표를 중지합니다.
 */
export function stopGoal(req: Request, res: Response, next: NextFunction): void {
}
