import type { Router } from "express";
import { registerAdminRoutes } from "./admin.routes.js";

import { registerAuthRoutes } from "./auth.routes.js";
import { registerBookmarksRoutes } from "./bookmarks.routes.js";
import { registerGoalsRoutes } from "./goals.routes.js";
import { registerInquiriesRoutes } from "./inquiries.routes.js";
import { registerRouteRecommendationRoutes } from "./routes.routes.js";
import { registerRunningRoutes } from "./running.routes.js";
import { registerUsersRoutes } from "./users.routes.js";
import { registerPlacesRoutes } from "./places.routes.js";

export function registerRouters(router: Router): void {
  // 0. 관리자
  registerAdminRoutes(router);
  
  // 1. 인증 인가
  registerAuthRoutes(router);
  
  // 2. 회원 정보
  registerUsersRoutes(router);
  
  // 3. 실제 파이썬 워커 호출 계층
  registerRouteRecommendationRoutes(router);

  // 장소 검색
  registerPlacesRoutes(router);
  
  // 4. 사용자 목표 설정 및 달리기
  registerGoalsRoutes(router);
  
  // 5. 사용자 실시간 러닝
  registerRunningRoutes(router);

  // 6. 러닝 코스 북마크
  registerBookmarksRoutes(router);

  // 7. 문의 관련
  registerInquiriesRoutes(router);
}
