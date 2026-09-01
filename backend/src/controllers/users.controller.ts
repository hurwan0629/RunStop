import type { Request, Response, NextFunction } from "express";

/**
 * 현재 사용자의 마이페이지 요약 정보를 반환합니다.
 */
export function getMyPage(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자의 수정 가능한 프로필 필드를 변경합니다.
 */
export function updateMe(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 관계형 서비스 기록을 보존하면서 현재 사용자를 탈퇴 처리합니다.
 */
export function withdrawMe(req: Request, res: Response, next: NextFunction): void {
}
