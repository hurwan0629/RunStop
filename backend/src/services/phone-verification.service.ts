import { createHash, randomInt, randomUUID } from "node:crypto";
import { ApiError } from "../middleware/error.js";
import { sendVerificationSms } from "../adapters/sms/sms.client.js";

export type PhoneVerificationPurpose = "SIGNUP" | "FIND_ID" | "RESET_PASSWORD";

// Map에 저장될 Map<verificationId, VerificationRecord>
type VerificationRecord = {
  purpose: PhoneVerificationPurpose;
  loginId?: string;
  phone: string;
  codeHash: string;     // 보내준 코드 sha 256 작업
  codeExpiresAt: Date;  // 인증번호 확인 3분
  verified: boolean;    // 인증 번호가 인증되어있는지
  verifiedUntil?: Date; // 인증번호 확인 성공 시 10분 늘려서 잡아주기
  attemptCount: number;
};

// 인증번호 요청시에 받아야할 요소 + loginId는 비밀번호 검사시에 사용하는 방향
type SendPhoneVerificationInput = {
  purpose: PhoneVerificationPurpose;
  phone: string;
  loginId?: string;
};

// 인증 코드 확인 요청에 들어갈 요소
type VerifyPhoneCodeInput = {
  purpose: PhoneVerificationPurpose;
  verificationId: string;
  code: string;
};

// 
type GetVerifiedPhoneVerificationInput = {
  purpose: PhoneVerificationPurpose;
  verificationId: string;
};

const CODE_TTL_MS = 3 * 60 * 1000;
const VERIFIED_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPT_COUNT = 5;

const verificationStore = new Map<string, VerificationRecord>();

function createVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashVerificationCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function isExpired(date: Date): boolean {
  return date.getTime() <= Date.now();
}

/**
 * purpose, phone, loginId?, code를 이용하여 `verificationStore: Map<verifiedIdString, VerificationrRecored>` 를 넣어주는 함수를 만들어줍니다.
 */
function createVerificationRecord(input: SendPhoneVerificationInput, code: string): VerificationRecord {
  const record: VerificationRecord = {
    purpose: input.purpose,
    phone: input.phone,
    codeHash: hashVerificationCode(code),
    codeExpiresAt: new Date(Date.now() + CODE_TTL_MS),
    verified: false,
    attemptCount: 0,
  };

  if (input.loginId) {
    record.loginId = input.loginId;
  }

  return record;
}

function getVerificationRecord(verificationId: string): VerificationRecord {
  const record = verificationStore.get(verificationId);

  if (!record) {
    throw new ApiError({
      status: 404,
      code: "VERIFICATION_NOT_FOUND",
      message: "전화번호 인증 요청을 찾을 수 없습니다.",
    });
  }

  return record;
}

function assertVerificationPurpose(record: VerificationRecord, purpose: PhoneVerificationPurpose): void {
  if (record.purpose !== purpose) {
    throw new ApiError({
      status: 400,
      code: "INVALID_VERIFICATION_PURPOSE",
      message: "전화번호 인증 목적이 일치하지 않습니다.",
    });
  }
}

function deleteExpiredVerification(verificationId: string, record: VerificationRecord): void {
  // verification 정보가 만료되었고, 
  if (isExpired(record.codeExpiresAt) && (!record.verifiedUntil || isExpired(record.verifiedUntil))) {
    verificationStore.delete(verificationId);
  }
}

/**
 * 전화번호 인증 요청을 만들고 인증번호를 발송합니다.
 */
export async function sendPhoneVerification(input: SendPhoneVerificationInput): Promise<{
  verificationId: string;
  expiresInSec: number;
}> {
  // 클라이언트에게 줄 랜덤 Id 만들기
  const verificationId = randomUUID();
  // 6자리 인증코드 만들기
  const code = createVerificationCode();

  // verification을 만들어서 verificationStore에 저장하기
  verificationStore.set(
    verificationId,
    createVerificationRecord(input, code),
  );

  // 전화번호를 사용자 (또는 개발시에는 콘솔)에게 보내주기
  await sendVerificationSms({
    phone: input.phone,
    code,
  });

  return {
    verificationId,
    expiresInSec: CODE_TTL_MS / 1000,
  };
}

/**
 * 제출된 전화번호 인증번호를 검증합니다.
 */
export async function verifyPhoneCode(input: VerifyPhoneCodeInput): Promise<{
  verified: true;
}> {
  // 사용자가 요청한 verificationId + purpose + code를 이용하여 인증번호가 맞는지를 인증
  const record = getVerificationRecord(input.verificationId);

  // 만료되었거나 purpose가 맞지 않으면 에러 반환해주기
  assertVerificationPurpose(record, input.purpose);
  deleteExpiredVerification(input.verificationId, record);

  if (isExpired(record.codeExpiresAt)) {
    throw new ApiError({
      status: 410,
      code: "VERIFICATION_EXPIRED",
      message: "전화번호 인증번호가 만료되었습니다.",
    });
  }

  // 5회 이상 틀려있담녀 취소시켜주기
  if (record.attemptCount >= MAX_ATTEMPT_COUNT) {
    verificationStore.delete(input.verificationId);

    throw new ApiError({
      status: 429,
      code: "VERIFICATION_ATTEMPT_EXCEEDED",
      message: "전화번호 인증 시도 횟수를 초과했습니다.",
    });
  }

  // 시도 횟수를 1 늘려준 뒤 코드를 sha256 방식으로 해싱하여 비교하기
  record.attemptCount += 1;

  if (record.codeHash !== hashVerificationCode(input.code)) {
    throw new ApiError({
      status: 400,
      code: "VERIFICATION_CODE_MISMATCH",
      message: "전화번호 인증번호가 일치하지 않습니다.",
    });
  }

  // 인증 코드가 맞다면 verified를 true로 설정해주며 만료 시간을 10분 뒤로 설정해주기
  record.verified = true;
  record.verifiedUntil = new Date(Date.now() + VERIFIED_TTL_MS);

  return {
    verified: true,
  };
}

/**
 * 완료되었거나 만료된 전화번호 인증 요청을 무효화합니다.
 */
export async function consumePhoneVerification(verificationId: string): Promise<void> {
  verificationStore.delete(verificationId);
}

/**
 * 다음 단계 진행에 사용할 수 있는 인증 완료 정보를 반환합니다.
 */
export function getVerifiedPhoneVerification(input: GetVerifiedPhoneVerificationInput): VerificationRecord {
  const record = getVerificationRecord(input.verificationId);

  // 해당 인증 정보가 사용할 수 없는 정보라면 폐기해주기
  assertVerificationPurpose(record, input.purpose);
  deleteExpiredVerification(input.verificationId, record);

  // 정보가 인증 되지 않았거나  인증된적이 없거나         만료되었으면 반환해주기
  if (!record.verified || !record.verifiedUntil || isExpired(record.verifiedUntil)) {
    throw new ApiError({
      status: 401,
      code: "PHONE_VERIFICATION_REQUIRED",
      message: "전화번호 인증이 필요합니다.",
    });
  }

  // 괜찮으면 반환해주기  
  return record;
}
