import type { Router } from "express";
import {
  checkLoginId,
  login,
  resetPassword,
  sendFindIdPhoneVerification,
  sendPasswordResetPhoneVerification,
  sendSignupPhoneVerification,
  signup,
  verifyFindIdPhoneCode,
  verifyPasswordResetPhoneCode,
  verifySignupPhoneCode,
} from "../controllers/auth.controller.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { requireGuest } from "../middleware/auth.js";

/**
 * 인증 및 계정 복구 라우트를 등록합니다.
 *
 * 라우트 그룹:
 * - POST /api/auth/check-login-id
 * - POST /api/auth/phone/send
 * - POST /api/auth/phone/verify
 * - POST /api/auth/signup
 * - POST /api/auth/login
 * - POST /api/auth/find-id/phone/send
 * - POST /api/auth/find-id/phone/verify
 * - POST /api/auth/password/phone/send
 * - POST /api/auth/password/phone/verify
 * - POST /api/auth/password/reset
 */
export function registerAuthRoutes(router: Router): void {
  
  // // // // // // // // // // // [로그인]  // // // // // // // // // // //

  // 일반 아이디/비번 로그인
  router.post("/api/auth/login", requireGuest, asyncHandler(login));



  // // // // // // // // // // // [회원가입]  // // // // // // // // // // //

  // 사용자 회원가입 시 아이디 중복 확인
  router.post("/api/auth/check-login-id", requireGuest, asyncHandler(checkLoginId));
  
  // 전화번호 인증 번호 요청 (회원가입)
  router.post("/api/auth/phone/send", requireGuest, asyncHandler(sendSignupPhoneVerification));
  
  // 전화번호 인증 시도
  router.post("/api/auth/phone/verify", requireGuest, asyncHandler(verifySignupPhoneCode));

  // 전화번호 인증 후 가능한 인증 요청
  router.post("/api/auth/signup", requireGuest, asyncHandler(signup));
  
  
  
  // // // // // // // // // // // [아이디 찾기]  // // // // // // // // // // //

  // 아이디 찾기용 인증번호 발송
  router.post("/api/auth/find-id/phone/send", requireGuest, asyncHandler(sendFindIdPhoneVerification));

  // 아이디 찾기용 인증번호 인증 시도
  router.post("/api/auth/find-id/phone/verify", requireGuest, asyncHandler(verifyFindIdPhoneCode));



  // // // // // // // // // // // [ 비밀번호 찾기 ] // // // // // // // // // // //

  // 비밀번호 재설정용 [아이디 + 인증번호 요청]
  router.post("/api/auth/password/phone/send", requireGuest, asyncHandler(sendPasswordResetPhoneVerification));

  // 비밀번호 재설정용 전화번호 인증
  router.post("/api/auth/password/phone/verify", requireGuest, asyncHandler(verifyPasswordResetPhoneCode));

  // 비밀번호용 전화번호 인증 후 가능한 인증 요청
  router.post("/api/auth/password/reset", requireGuest, asyncHandler(resetPassword));
}
