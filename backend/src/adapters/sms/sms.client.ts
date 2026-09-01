import { env } from "../../config/env.js";
import { ApiError } from "../../middleware/error.js";

// SMS에서 보내줄 코드 + 전화번호를 스키마로 설정
type SendVerificationSmsInput = {
  phone: string;
  code: string;
};

// 개발용 콘솔 SMS 함수
async function sendVerificationSmsByConsole(input: SendVerificationSmsInput): Promise<void> {
  console.log(`[SMS 인증번호] phone=${input.phone}, code=${input.code}`);
}

// API를 통한 발송 함수
async function sendVerificationSmsByApi(input: SendVerificationSmsInput): Promise<void> {
  throw new ApiError({
    status: 501,
    code: "SMS_API_NOT_IMPLEMENTED",
    message: "SMS API 연동이 아직 구현되지 않았습니다.",
  });
}

/**
 * 전화번호 인증 SMS 메시지를 발송합니다.
 */
export async function sendVerificationSms(input: SendVerificationSmsInput): Promise<void> {
  // 환경변수에 따라 API를 사용해주기
  if (env.SMS_API_ENABLED) {
    await sendVerificationSmsByApi(input);
    return;
  }

  // 인증 번호를 콘솔로 보내주기
  await sendVerificationSmsByConsole(input);
}
  
