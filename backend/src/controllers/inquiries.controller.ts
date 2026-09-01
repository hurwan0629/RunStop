import type { Request, Response, NextFunction } from "express";

/**
 * 현재 사용자 또는 관리자 화면에 필요한 문의 목록을 반환합니다.
 */
export function listInquiries(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 현재 사용자의 새 문의를 생성합니다.
 */
export function createInquiry(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 문의 상세 데이터를 반환합니다.
 */
export function getInquiryDetail(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 문의 처리 상태를 변경합니다.
 */
export function updateInquiryStatus(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 문의에 관리자 답변을 등록합니다.
 */
export function answerInquiry(req: Request, res: Response, next: NextFunction): void {
}
