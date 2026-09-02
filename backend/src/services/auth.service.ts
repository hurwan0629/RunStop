import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthResponseDTO } from "../dto/auth/auth-response.dto.js";
import type { LoginDTO } from "../dto/auth/login.dto.js";
import type {
  PasswordResetPhoneVerificationSendDTO,
  PhoneVerificationSendDTO,
  PhoneVerificationVerifyDTO,
} from "../dto/auth/phone-verification.dto.js";
import type { PasswordResetDTO } from "../dto/auth/password-reset.dto.js";
import type { SignupDTO } from "../dto/auth/signup.dto.js";
import { withTransaction } from "../infra/db/transaction.js";
import { ApiError } from "../middleware/error.js";
import {
  createUserProfile,
  type CreateUserProfileInput,
} from "../repositories/user-profiles.repository.js";
import {
  createUser,
  findAuthUserByIdx,
  findUserByLoginIdAndPhone,
  findUserByLoginId,
  findUserByPhone,
  restoreExpiredSuspension,
  updatePasswordHash,
  updateLastLoginAt,
} from "../repositories/users.repository.js";
import type { UserRole } from "../types/user-context.js";
import {
  consumePhoneVerification,
  getVerifiedPhoneVerification,
  sendPhoneVerification,
  verifyPhoneCode,
} from "./phone-verification.service.js";

export type AuthenticatedUser = {
  idx: number;
  role: UserRole;
};

function isSuspendedUntilActive(suspendedUntil: Date | null): boolean {
  if (!suspendedUntil) {
    return true;
  }

  return suspendedUntil.getTime() > Date.now();
}

function isSuspensionExpired(suspendedUntil: Date | null): boolean {
  return suspendedUntil !== null && suspendedUntil.getTime() <= Date.now();
}

function createAccessToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      idx: user.idx,
      role: user.role,
    },
    env.JWT_SECRET,
    {
      expiresIn: "1d",
      issuer: "runstop",
      subject: String(user.idx),
    },
  );
}

/**
 * 비밀번호를 bcrypt로 해시합니다.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
}

/**
 * 회원가입에 사용할 수 있는 로그인 아이디인지 확인합니다.
 */
export async function checkLoginIdAvailability(loginId: string): Promise<{ available: boolean }> {
  const user = await findUserByLoginId(loginId);

  return {
    available: !user,
  };
}

/**
 * 회원가입용 전화번호 인증번호를 발송합니다.
 */
export async function sendSignupPhoneVerification(phone: string): Promise<{
  verificationId: string;
  expiresInSec: number;
}> {
  const user = await findUserByPhone(phone);

  if (user) {
    throw new ApiError({
      status: 409,
      code: "PHONE_ALREADY_EXISTS",
      message: "이미 가입된 전화번호입니다.",
    });
  }

  return sendPhoneVerification({
    purpose: "SIGNUP",
    phone,
  });
}

/**
 * 회원가입용 전화번호 인증번호를 검증합니다.
 */
export async function verifySignupPhoneCode(input: PhoneVerificationVerifyDTO): Promise<{ verified: true }> {
  return verifyPhoneCode({
    purpose: "SIGNUP",
    verificationId: input.verificationId,
    code: input.code,
  });
}

/**
 * 아이디 찾기용 전화번호 인증번호를 발송합니다.
 */
export async function sendFindIdPhoneVerification(input: PhoneVerificationSendDTO): Promise<{
  verificationId: string;
  expiresInSec: number;
}> {
  // 전화번호에 대한 사용자가 존재하는지 확인하고 존재하지 않거나 정지 등의 상태이면 반려해줍니다.
  const user = await findUserByPhone(input.phone);

  if (!user) {
    throw new ApiError({
      status: 404,
      code: "PHONE_USER_NOT_FOUND",
      message: "해당 전화번호로 가입된 사용자를 찾을 수 없습니다.",
    });
  }

  if (user.status === "WITHDRAWN") {
    throw new ApiError({
      status: 410,
      code: "WITHDRAWN_USER",
      message: "탈퇴한 사용자입니다.",
    });
  }

  // phone-verification.service 에서 Map를 등록해준 뒤 sms 어댑터를 이용하여 발송해줍니다.
  return sendPhoneVerification({
    purpose: "FIND_ID",
    phone: input.phone,
  });
}

/**
 * 아이디 찾기용 인증번호를 검증하고 로그인 아이디를 반환합니다.
 */
export async function verifyFindIdPhoneCode(input: PhoneVerificationVerifyDTO): Promise<{ loginId: string }> {
  // PhoneVerificatoinVerifyDTO 에는 phone와 code가 들어가 있습니다.

  // 해당 verificationId에 대해서 코드가 존재하는지 및 맞는지를 확인하고 잘못되었으면 에러를 터트려줍니다.
  await verifyPhoneCode({
    purpose: "FIND_ID",
    verificationId: input.verificationId,
    code: input.code,
  });

  // 해당 verificationStore에서 purpose & verificationId를 이용하여 VerificationRecord를 받아줍니다.
  const verification = getVerifiedPhoneVerification({
    purpose: "FIND_ID",
    verificationId: input.verificationId,
  });

  // 사용자 전화번호를 이용하여 사용자 정보를 받아옵니다.
  const user = await findUserByPhone(verification.phone);

  // 유효성검사
  if (!user || user.status === "WITHDRAWN") {
    throw new ApiError({
      status: 404,
      code: "PHONE_USER_NOT_FOUND",
      message: "해당 전화번호로 가입된 사용자를 찾을 수 없습니다.",
    });
  }

  // 해당 전화번호 인증 식별자를 Map에서 삭제해줍니다.
  await consumePhoneVerification(input.verificationId);

  // 사용자의 로그인 id를 반환하여 줍니다.
  return {
    loginId: user.loginId,
  };
}

/**
 * 비밀번호 재설정용 전화번호 인증번호를 발송합니다.
 */
export async function sendPasswordResetPhoneVerification(
  input: PasswordResetPhoneVerificationSendDTO,
): Promise<{
  verificationId: string;
  expiresInSec: number;
}> {
  // 사용자 로그인 아이디와 전화번호를 받아서 아이디를 발송해줍니다.
  const user = await findUserByLoginIdAndPhone(input.loginId, input.phone);

  if (!user) {
    throw new ApiError({
      status: 404,
      code: "PASSWORD_RESET_USER_NOT_FOUND",
      message: "로그인 아이디와 전화번호가 일치하는 사용자를 찾을 수 없습니다.",
    });
  }

  if (user.status === "WITHDRAWN") {
    throw new ApiError({
      status: 410,
      code: "WITHDRAWN_USER",
      message: "탈퇴한 사용자입니다.",
    });
  }

  // 사용자의 전화번호로 인증코드를 발송해줍니다. + codeExpiresAt를 설정해줍니다.
  return sendPhoneVerification({
    purpose: "RESET_PASSWORD",
    loginId: input.loginId,
    phone: input.phone,
  });
}

/**
 * 비밀번호 재설정용 전화번호 인증번호를 검증합니다.
 */
export async function verifyPasswordResetPhoneCode(input: PhoneVerificationVerifyDTO): Promise<{ verified: true }> {
  // code + purpose +  verification을 이용하여 전화번호를 인증해주게 됩니다.
  return verifyPhoneCode({
    purpose: "RESET_PASSWORD",
    verificationId: input.verificationId,
    code: input.code,
  });
}

/**
 * 전화번호 인증 완료 정보를 사용해서 비밀번호를 재설정합니다.
 */
export async function resetUserPassword(input: PasswordResetDTO): Promise<{ reset: true }> {
  // 사용자의 입력으로는 newPassword와 verificationId가 존재합니다.

  // purpose + verificationId가 유효한지 검사하며 괜찮으면 VerificationRecord를 가져오게 됩니다.
  const verification = getVerifiedPhoneVerification({
    purpose: "RESET_PASSWORD",
    verificationId: input.verificationId,
  });


  if (!verification.loginId) {
    throw new ApiError({
      status: 400,
      code: "PASSWORD_RESET_VERIFICATION_INVALID",
      message: "비밀번호 재설정 인증 정보가 올바르지 않습니다.",
    });
  }

  // 로그인 아이디와 전화번호를 이용해서 사용자 정보를 가져옵니다.
  const user = await findUserByLoginIdAndPhone(verification.loginId, verification.phone);

  if (!user || user.status === "WITHDRAWN") {
    throw new ApiError({
      status: 404,
      code: "PASSWORD_RESET_USER_NOT_FOUND",
      message: "비밀번호를 재설정할 사용자를 찾을 수 없습니다.",
    });
  }

  // 
  const passwordHash = await hashPassword(input.newPassword);

  await updatePasswordHash(user.idx, passwordHash);
  await consumePhoneVerification(input.verificationId);

  return {
    reset: true,
  };
}


/**
 * 전화번호 인증 완료 정보를 사용해서 사용자 계정을 생성합니다.
 */
export async function signupUser(signupDto: SignupDTO): Promise<AuthResponseDTO> {
  // verificationStore에 존재하는 VerificationRecord를 유효한 경우에 가져와서 회원가입을 시켜주게 됩니다.
  const verification = getVerifiedPhoneVerification({
    purpose: "SIGNUP",
    verificationId: signupDto.verificationId,
  });

  if (verification.phone !== signupDto.phone) {
    throw new ApiError({
      status: 400,
      code: "PHONE_VERIFICATION_MISMATCH",
      message: "인증된 전화번호와 회원가입 전화번호가 일치하지 않습니다.",
    });
  }

  // 사용자 로그인 아이디로 
  const [loginIdUser, phoneUser] = await Promise.all([
    findUserByLoginId(signupDto.loginId),
    findUserByPhone(signupDto.phone),
  ]);

  if (loginIdUser) {
    throw new ApiError({
      status: 409,
      code: "LOGIN_ID_ALREADY_EXISTS",
      message: "이미 사용 중인 로그인 아이디입니다.",
    });
  }

  if (phoneUser) {
    throw new ApiError({
      status: 409,
      code: "PHONE_ALREADY_EXISTS",
      message: "이미 가입된 전화번호입니다.",
    });
  }

  const passwordHash = await hashPassword(signupDto.password);

  const createdUser = await withTransaction(async (client) => {
    const user = await createUser(
      {
        loginId: signupDto.loginId,
        passwordHash,
        nickname: signupDto.nickname,
        phone: signupDto.phone,
        role: "USER",
      },
      client,
    );

    const profileInput: CreateUserProfileInput = {
      userIdx: user.idx,
    };

    if (signupDto.profile?.weightKg !== undefined) {
      profileInput.weightKg = signupDto.profile.weightKg;
    }

    if (signupDto.profile?.heightCm !== undefined) {
      profileInput.heightCm = signupDto.profile.heightCm;
    }

    await createUserProfile(profileInput, client);

    return user;
  });

  await consumePhoneVerification(signupDto.verificationId);

  return {
    accessToken: createAccessToken({
      idx: createdUser.idx,
      role: createdUser.role,
    }),
    user: {
      idx: createdUser.idx,
      nickname: createdUser.nickname,
      role: createdUser.role,
    },
  };
}

/**
 * 로그인 정보를 검증하고 액세스 토큰을 생성합니다.
 */
export async function loginUser(loginDto: LoginDTO): Promise<AuthResponseDTO> {
  const user = await findUserByLoginId(loginDto.loginId);

  if (!user) {
    throw new ApiError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  const passwordMatched = await bcrypt.compare(loginDto.password, user.passwordHash);

  if (!passwordMatched) {
    throw new ApiError({
      status: 401,
      code: "INVALID_CREDENTIALS",
      message: "아이디 또는 비밀번호가 올바르지 않습니다.",
    });
  }

  if (user.status === "WITHDRAWN") {
    throw new ApiError({
      status: 410,
      code: "WITHDRAWN_USER",
      message: "탈퇴한 사용자입니다.",
    });
  }

  if (user.status === "SUSPENDED" && user.suspendedUntil === null) {
    throw new ApiError({
      status: 423,
      code: "PERMANENTLY_SUSPENDED_USER",
      message: "영구 정지된 사용자입니다.",
    });
  }

  if (user.status === "SUSPENDED" && isSuspensionExpired(user.suspendedUntil)) {
    await restoreExpiredSuspension(user.idx);
    user.status = "ENABLED";
    user.suspendedUntil = null;
  }

  if (user.status === "SUSPENDED" && isSuspendedUntilActive(user.suspendedUntil)) {
    throw new ApiError({
      status: 423,
      code: "SUSPENDED_USER",
      message: "이용 정지된 사용자입니다.",
      details: {
        suspendedUntil: user.suspendedUntil,
      },
    });
  }

  await updateLastLoginAt(user.idx);

  const authenticatedUser = {
    idx: user.idx,
    role: user.role,
  };

  return {
    accessToken: createAccessToken(authenticatedUser),
    user: {
      idx: user.idx,
      nickname: user.nickname,
      role: user.role,
    },
  };
}

/**
 * 전화번호 인증 후 사용자의 로그인 아이디를 찾습니다.
 */
// 아이디 찾기 구현은 verifyFindIdPhoneCode에서 처리합니다.

/**
 * 전화번호 인증 후 사용자의 비밀번호를 재설정합니다.
 */
// 비밀번호 재설정 구현은 resetUserPassword에서 처리합니다.

/**
 * JWT 검증 이후 DB의 최신 사용자 상태와 권한을 확인합니다.
 */
export async function validateAccessTokenUser(userIdx: number): Promise<AuthenticatedUser> {
  const user = await findAuthUserByIdx(userIdx);

  if (!user) {
    throw new ApiError({
      status: 401,
      code: "INVALID_ACCESS_TOKEN_USER",
      message: "인증 토큰의 사용자를 찾을 수 없습니다.",
    });
  }

  if (user.status === "WITHDRAWN") {
    throw new ApiError({
      status: 410,
      code: "WITHDRAWN_USER",
      message: "탈퇴한 사용자입니다.",
    });
  }

  if (user.status === "SUSPENDED" && isSuspendedUntilActive(user.suspendedUntil)) {
    throw new ApiError({
      status: 423,
      code: "SUSPENDED_USER",
      message: "이용 정지된 사용자입니다.",
      details: {
        suspendedUntil: user.suspendedUntil,
      },
    });
  }

  return {
    idx: user.idx,
    role: user.role,
  };
}
