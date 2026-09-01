import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthResponseDTO } from "../dto/auth/auth-response.dto.js";
import type { LoginDTO } from "../dto/auth/login.dto.js";
import type { PhoneVerificationVerifyDTO } from "../dto/auth/phone-verification.dto.js";
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
  findUserByLoginId,
  findUserByPhone,
  restoreExpiredSuspension,
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
 * 전화번호 인증 완료 정보를 사용해서 사용자 계정을 생성합니다.
 */
export async function signupUser(signupDto: SignupDTO): Promise<AuthResponseDTO> {
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
export async function findLoginIdByVerifiedPhone() {
}

/**
 * 전화번호 인증 후 사용자의 비밀번호를 재설정합니다.
 */
export async function resetUserPassword() {
}

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
