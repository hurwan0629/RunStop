import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { env } from "../config/env.js";

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.body.password",
  "req.body.newPassword",
  "req.body.accessToken",
  "req.body.refreshToken",
  "req.body.code",
  "req.body.verificationCode",
  "password",
  "newPassword",
  "accessToken",
  "refreshToken",
  "code",
  "verificationCode",
];

type RequestWithUser = IncomingMessage & {
  id?: string;
  user?: {
    idx: number;
    role: string;
  };
};

/**
 * 애플리케이션 로거 인스턴스를 생성합니다.
 */
export function createLogger() {
  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: "runstop-backend",
      env: env.NODE_ENV,
    },
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
  });
}

export const logger = createLogger();

/**
 * 익스프레스 요청 로깅 미들웨어를 생성합니다.
 */
export function createRequestLogger() {
  return pinoHttp({
    logger,
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const headerRequestId = req.headers["x-request-id"];
      const requestId = Array.isArray(headerRequestId)
        ? headerRequestId[0]
        : headerRequestId;
      const resolvedRequestId = requestId ?? randomUUID();

      res.setHeader("x-request-id", resolvedRequestId);

      return resolvedRequestId;
    },
    customProps: (req: IncomingMessage) => {
      const request = req as RequestWithUser;

      return {
        userIdx: request.user?.idx,
        userRole: request.user?.role,
      };
    },
    customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => (
      `http:request:completed ${req.method ?? ""} ${req.url ?? ""} ${res.statusCode}`
    ),
    customErrorMessage: (req: IncomingMessage, res: ServerResponse) => (
      `http:request:failed ${req.method ?? ""} ${req.url ?? ""} ${res.statusCode}`
    ),
  });
}
