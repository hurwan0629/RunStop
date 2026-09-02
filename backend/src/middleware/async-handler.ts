import type { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "../logging/logger.js";

type RequestWithLogger = Request & {
  log?: typeof logger;
};

function getRequestLogger(req: RequestWithLogger) {
  return req.log ?? logger;
}

/**
 * 비동기 컨트롤러에서 발생한 에러를 Express next로 전달합니다.
 */
export function asyncHandler(
  // 실제로 돌아가야하는 async 함수를 인자로 받습니다.
  handler: (req: Request, res: Response, next: NextFunction) => void | Promise<void>,
): RequestHandler {
  // 특별한 작업을 하지 않고 Promise.resolve를 이용하여 응답하며 에러 등의 처리는 next 객체를 이용하여 처리할 수 있게 합니다.
  return (req, res, next) => {
    const controller = handler.name || "anonymousController";
    const startedAt = Date.now();
    const requestLogger = getRequestLogger(req);

    requestLogger.info({
      controller,
      method: req.method,
      url: req.originalUrl,
      userIdx: req.user?.idx,
    }, "controller:start");

    Promise.resolve(handler(req, res, next))
      .then(() => {
        requestLogger.info({
          controller,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
          userIdx: req.user?.idx,
        }, "controller:success");
      })
      .catch((error: unknown) => {
        requestLogger.error({
          controller,
          method: req.method,
          url: req.originalUrl,
          durationMs: Date.now() - startedAt,
          userIdx: req.user?.idx,
          err: error,
        }, "controller:error");

        next(error);
      });
  };
}
