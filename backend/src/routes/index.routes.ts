import type { Router } from "express";

import { registerAuthRoutes } from "./auth.routes.js";
import { registerBookmarksRoutes } from "./bookmarks.routes.js";
import { registerGoalsRoutes } from "./goals.routes.js";
import { registerInquiriesRoutes } from "./inquiries.routes.js";
import { registerRouteRecommendationRoutes } from "./routes.routes.js";
import { registerRunningRoutes } from "./running.routes.js";
import { registerUsersRoutes } from "./users.routes.js";


export function registerRouters(router: Router): void {
  registerAuthRoutes(router);
  
  registerUsersRoutes(router);

  registerRunningRoutes(router);

  registerGoalsRoutes(router);

  registerRouteRecommendationRoutes(router);

  registerBookmarksRoutes(router);

  registerInquiriesRoutes(router);
}