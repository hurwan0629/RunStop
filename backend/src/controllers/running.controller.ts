import type { Request, Response, NextFunction } from "express";

/**
 * 현재 사용자의 러닝 기록 요약과 목록을 반환합니다.
 */
export function listRunningSessions(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 선택된 추천 코스를 기준으로 러닝 세션을 시작합니다.
 */
export function startRunningSession(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 진행 중인 러닝 세션에 하나 이상의 GPS 트랙포인트를 저장합니다.
 */
export function saveRunningTrackpoints(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 러닝 세션을 종료하고 실제 거리 및 페이스 계산을 준비합니다.
 */
export function finishRunningSession(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 러닝 세션의 1km 단위 페이스 분석 결과를 반환합니다.
 */
export function getRunningPace(req: Request, res: Response, next: NextFunction): void {
}
