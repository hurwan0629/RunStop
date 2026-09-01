import type { NextFunction, Request, Response } from "express";

type ApiErrorOptions = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
};

/**
 * 전역 에러 핸들러에서 공통 응답으로 변환할 수 있는 애플리케이션 에러입니다.
 */
export class ApiError extends Error {
  // 값을 생성시 이외에는 수정할 수 없게 변경
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  // 위에서 정의한 status, code, message, detils에 대한 객체를 생성자의 인자로 받는 에러
  constructor(options: ApiErrorOptions) {
    super(options.message);

    this.name = "ApiError";
    this.status = options.status;
    this.code = options.code;

    // details가 있으면 객체에 넣어서 주기
    if ("details" in options) {
      this.details = options.details;
    }
  }
}

/**
 * 알 수 없는 에러를 공통 API 에러 응답 형식으로 변환합니다.
 */
export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction): void {
  
  // 이미 헤더가 클라이언트에게 보내진 상태면 다음 에러 처리로 넘기라는 의미
  if (res.headersSent) {
    next(error);
    return;
  }

  // 에러의 타입이 ApiError이라면 그대로 사용해주기
  if (error instanceof ApiError) {
    res.status(error.status).json({
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
    });
    return;
  }

  // ApiError 하위 타입이 아니며 서버 내부에 정의되어있지 않은 값이라면 그대로 고정된 에러 응답으로 보내주기
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "서버 내부 오류가 발생했습니다.",
    },
  });
}

/**
 * 등록된 라우트와 매칭되지 않은 요청을 처리합니다.
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  next(
    new ApiError({
      status: 404,
      code: "NOT_FOUND",
      message: "요청한 API를 찾을 수 없습니다.",
    }),
  );
}
