import type { NextFunction, Request, Response } from "express";
import { authResponseSchema } from "../dto/auth/auth-response.dto.js";
import { loginIdCheckSchema } from "../dto/auth/login-id-check.dto.js";
import { loginSchema } from "../dto/auth/login.dto.js";
import {
  phoneVerificationSendSchema,
  phoneVerificationVerifySchema,
} from "../dto/auth/phone-verification.dto.js";
import { signupSchema } from "../dto/auth/signup.dto.js";
import { ApiError } from "../middleware/error.js";
import {
  checkLoginIdAvailability,
  loginUser,
  sendSignupPhoneVerification as sendSignupPhoneVerificationService,
  signupUser,
  verifySignupPhoneCode as verifySignupPhoneCodeService,
} from "../services/auth.service.js";

// // // // // // // // // // // [로그인] // // // // // // // // // // //

/**
 * 사용자 로그인 정보를 검증하고 액세스 토큰을 발급합니다.
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  const loginParseResult = loginSchema.safeParse(req.body);

  if (!loginParseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_LOGIN_REQUEST",
      message: "로그인 요청 값이 올바르지 않습니다.",
      details: loginParseResult.error.flatten(),
    });
  }

  const authResponse = await loginUser(loginParseResult.data);

  res.json({
    success: true,
    data: authResponseSchema.parse(authResponse),
  });
}

// // // // // // // // // // // [회원가입] // // // // // // // // // // //

/**
 * 회원가입에 사용할 수 있는 로그인 아이디인지 확인합니다.
 */
export async function checkLoginId(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parseResult = loginIdCheckSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_LOGIN_ID_CHECK_REQUEST",
      message: "로그인 아이디 확인 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await checkLoginIdAvailability(parseResult.data.loginId);

  res.json({
    success: true,
    data: result,
  });
}

/**
 * 회원가입용 전화번호 인증번호를 발송합니다.
 */
export async function sendSignupPhoneVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parseResult = phoneVerificationSendSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_PHONE_VERIFICATION_SEND_REQUEST",
      message: "전화번호 인증번호 발송 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await sendSignupPhoneVerificationService(parseResult.data.phone);

  res.json({
    success: true,
    data: result,
  });
}

/**
 * 회원가입용 전화번호 인증번호를 검증합니다.
 */
export async function verifySignupPhoneCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parseResult = phoneVerificationVerifySchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_PHONE_VERIFICATION_VERIFY_REQUEST",
      message: "전화번호 인증번호 검증 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await verifySignupPhoneCodeService(parseResult.data);

  res.json({
    success: true,
    data: result,
  });
}

/**
 * 최종 회원가입 정보를 검증하고 사용자 계정을 생성합니다.
 */
export async function signup(req: Request, res: Response, next: NextFunction): Promise<void> {
  const parseResult = signupSchema.safeParse(req.body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_SIGNUP_REQUEST",
      message: "회원가입 요청 값이 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const authResponse = await signupUser(parseResult.data);

  res.status(201).json({
    success: true,
    data: authResponseSchema.parse(authResponse),
  });
}

// // // // // // // // // // // [아이디 찾기] // // // // // // // // // // //

/**
 * 아이디 찾기용 전화번호 인증번호를 발송합니다.
 */
export function sendFindIdPhoneVerification(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 아이디 찾기용 인증번호를 검증하고 일치하는 로그인 아이디를 반환합니다.
 */
export function verifyFindIdPhoneCode(req: Request, res: Response, next: NextFunction): void {
}

// // // // // // // // // // // [비밀번호 찾기] // // // // // // // // // // //

/**
 * 비밀번호 재설정용 전화번호 인증번호를 발송합니다.
 */
export function sendPasswordResetPhoneVerification(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 비밀번호 재설정용 전화번호 인증번호를 검증합니다.
 */
export function verifyPasswordResetPhoneCode(req: Request, res: Response, next: NextFunction): void {
}

/**
 * 전화번호 인증 후 사용자의 비밀번호를 재설정합니다.
 */
export function resetPassword(req: Request, res: Response, next: NextFunction): void {
}
