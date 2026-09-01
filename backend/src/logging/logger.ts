import pino from "pino";
import { pinoHttp } from "pino-http";

/**
 * 애플리케이션 로거 인스턴스를 생성합니다.
 */
export function createLogger() {
  return pino()
}

export const logger =  createLogger();

/**
 * 익스프레스 요청 로깅 미들웨어를 생성합니다.
 */
export function createRequestLogger() {
  return pinoHttp({
    logger
  })
}

