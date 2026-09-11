import type { Router } from "express";
import { suspendUser } from "../controllers/admin.controller.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/async-handler.js";

export function registerAdminRoutes(router: Router): void {
  router.patch("/api/admin/users/suspension", authenticate, requireAdmin, asyncHandler(suspendUser));
}
