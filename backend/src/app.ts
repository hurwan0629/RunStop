import express from "express";
import helmet from "helmet";
import { registerAuthRoutes } from "./routes/auth.routes.js";
import { registerBookmarksRoutes } from "./routes/bookmarks.routes.js";
import { registerGoalsRoutes } from "./routes/goals.routes.js";
import { registerInquiriesRoutes } from "./routes/inquiries.routes.js";
import { registerRouteRecommendationRoutes } from "./routes/routes.routes.js";
import { registerRunningRoutes } from "./routes/running.routes.js";
import { registerUsersRoutes } from "./routes/users.routes.js";
import { createRequestLogger } from "./logging/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";

/**
 * 익스프레스 애플리케이션 인스턴스를 생성하고 기본 설정을 구성합니다.
 *
 * 역할:
 * - 공통 미들웨어 등록
 * - 도메인 라우터 연결
 * - 404 및 전역 에러 핸들러 등록
 */
export function createApp() {
  const app = express();

  // 헬멧을 통해서 XSS, 스니핑 등 방지
  app.use(helmet());
  // 요청별 requestId, 응답 상태, 처리 시간을 로그로 남기기
  app.use(createRequestLogger());
  // json 타입 요청 받아주기
  app.use(express.json());

  // 도메인별 라우터 등록
  const router = express.Router();

  // 각 도메인 7개에 대해서 라우터 등록해주기
  registerAuthRoutes(router);
  registerUsersRoutes(router);
  registerRunningRoutes(router);
  registerGoalsRoutes(router);
  registerRouteRecommendationRoutes(router);
  registerBookmarksRoutes(router);
  registerInquiriesRoutes(router);

  app.get("/health", (req, res) => {
    res.json({
      name: "node server",
      status: "ok",
    });
  });

  app.use(router);

  // API 
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
