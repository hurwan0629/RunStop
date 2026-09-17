import { z } from "zod";

// 핸드폰 인증 요청 가능 purpose 종류
export const phoneVerificationPurposeSchema = z.enum([
  "SIGNUP",
  "FIND_ID",
  "RESET_PASSWORD",
]);

// 전화번호 검수
export const phoneVerificationSendSchema = z.object({
  phone: z.string().min(10).max(20),
});

// 비밀번호 검사할 때에는 아이디와 전화번호를 동시에 줘야함
export const passwordResetPhoneVerificationSendSchema = z.object({
  loginId: z.string().min(4).max(50),
  phone: z.string().min(10).max(20),
});

export const phoneVerificationVerifySchema = z.object({
  verificationId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export type PhoneVerificationPurposeDTO =
  z.infer<typeof phoneVerificationPurposeSchema>;

export type PhoneVerificationSendDTO =
  z.infer<typeof phoneVerificationSendSchema>;

export type PasswordResetPhoneVerificationSendDTO =
  z.infer<typeof passwordResetPhoneVerificationSendSchema>;

export type PhoneVerificationVerifyDTO =
  z.infer<typeof phoneVerificationVerifySchema>;
