import type { Router } from "express";
import {
  answerInquiry,
  createInquiry,
  getInquiryDetail,
  listInquiries,
  updateInquiryStatus,
} from "../controllers/inquiries.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";

/**
 * 사용자 문의 및 관리자 답변 라우트를 등록합니다.
 *
 * 라우트 그룹:
 * - GET /api/inquiries
 * - POST /api/inquiries
 * - GET /api/inquiries/:inquiryIdx
 * - PATCH /api/inquiries/:inquiryIdx/status
 * - POST /api/inquiries/:inquiryIdx/answer
 */
export function registerInquiriesRoutes(router: Router): void {

  
  router.get("/api/inquiries", authenticate, asyncHandler(listInquiries));
  
  router.post("/api/inquiries", authenticate, asyncHandler(createInquiry));
  
  router.get("/api/inquiries/:inquiryIdx", authenticate, asyncHandler(getInquiryDetail));
  
  router.patch("/api/inquiries/:inquiryIdx/status", authenticate, requireAdmin, asyncHandler(updateInquiryStatus));
  
  router.post("/api/inquiries/:inquiryIdx/answer", authenticate, requireAdmin, asyncHandler(answerInquiry));
}
