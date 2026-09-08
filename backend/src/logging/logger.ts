import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import pino, { type LoggerOptions } from "pino";
import { pinoHttp } from "pino-http";
import { env } from "../config/env.js";

const REDACT_PATHS = [
  "req.headers.authorization",
  "req.headers.cookie",
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
  const options: LoggerOptions = {
    level: env.LOG_LEVEL,
    base: {
      service: "runstop-backend",
      env: env.NODE_ENV,
    },
    redact: {
      paths: REDACT_PATHS,
      censor: "[REDACTED]",
    },
  };

  if (env.NODE_ENV === "development") {
    options.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
        singleLine: false,
        ignore: "pid,hostname",
      },
    };
  }

  return pino(options);
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
    customLogLevel: (req: IncomingMessage, res: ServerResponse, error?: Error) => {
      if (error || res.statusCode >= 500) {
        return "error";
      }

      if (res.statusCode >= 400) {
        return "warn";
      }

      return "info";
    },
  });
}
