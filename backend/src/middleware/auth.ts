import type { NextFunction, Request, Response } from "express";
import * as jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { validateAccessTokenUser } from "../services/auth.service.js";
import { ApiError } from "./error.js";
import type { UserRole } from "../types/user-context.js";


// 접근할 시에 존재하는 jwt에 존재하는 정보는 jwt PayLoad에 사용자 idx와 role만을 넣어둡니다.
type AccessTokenPayload = JwtPayload & {
  idx?: unknown;
  role?: unknown;
};

// 사용자 권한 관련 에러가 난다면 해당 에러 생성 함수를 사용합니다.
function createAuthError(
  status: number,
  code: string,
  message: string,
): ApiError {
  return new ApiError({
    status,
    code,
    message,
  });
}

// 해당 Request 객체에서 Bearer <jwt> 값을 꺼내어 해당 값이 존재하지 않는다면 undefined를 반환해줍니다.
function getBearerToken(req: Request): string | undefined {
  // 클라이언트에서 보낸 req.headers 에서 authtorization에 대해서 뽑아주기
  const authorization = req.headers.authorization;

  // authorization이 없으면 undefined 반환
  if (!authorization) {
    return undefined;
  }

  // ['Bearer 또는 무언가', 'token'] 으로 분리해주기
  const [scheme, token] = authorization.split(" ");

  // 인증 값이 올바르지 않다면 undefined 반환
  if (scheme !== "Bearer" || !token) {  
    return undefined;
  }

  // 최종적으로 올바른 구조이면 토큰 뽑아주기
  return token;
}

// 역할을 뽑아주는 함수
function isUserRole(value: unknown): value is UserRole {
  return value === "USER" || value === "ADMIN";
}

/*
* jwt와 jwtSecret를 이용하여 해당 payload 객체를 반환해주기
*/
function readAccessTokenPayload(token: string, jwtSecret: string): AccessTokenPayload | undefined {
  const payload = jwt.verify(token, jwtSecret);

  // 일반 문자열이 반환되었다면 예상하지 않은 구조이기 때문에 undefined 반환해주기
  if (typeof payload === "string") {
    return undefined;
  }

  // 객체 반환
  return payload;
}

/**
 * JWT 액세스 토큰을 검증하고 인증된 사용자 정보를 요청 객체에 추가합니다. (실제 로그인 인증 미들웨어)
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  // req에서 Bearer Token을 가져오거나 undefined 반환
  const token = getBearerToken(req);

  // 없으면 401 에러 처리
  if (!token) {
    next(createAuthError(401, "UNAUTHORIZED", "인증 토큰이 필요합니다."));
    return;
  }

  let payload: AccessTokenPayload | undefined;

  try {
    // token문자열과 jwtSecret를 줘서 payload 객체를 받아오기.
    payload = readAccessTokenPayload(token, env.JWT_SECRET);
  } catch (error) {
    next(createAuthError(401, "INVALID_ACCESS_TOKEN", "인증 토큰이 유효하지 않습니다."));
    return;
  }

  // payload가 undefined이거나 idx가 숫자가 아니거나 사용자의 역할이 USER 또는 ADMIN 아니라면 401 에러를 내주기
  if (!payload || typeof payload.idx !== "number" || !isUserRole(payload.role)) {
    next(createAuthError(401, "INVALID_ACCESS_TOKEN", "인증 토큰 정보가 올바르지 않습니다."));
    return;
  }

  try {
    // JWT 발급 이후 정지/탈퇴/권한 변경이 발생할 수 있으므로 DB의 최신 사용자 상태를 다시 확인해주기
    const user = await validateAccessTokenUser(payload.idx);

    // 다음 controller의 모든 req 객체에 대해서 user에 idx, role을 넣어주기
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * 인증된 사용자가 관리자 권한을 가지고 있는지 확인합니다.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // 위의 authenticate 함수 이후에 관리자 권한까지 필요한 경우에 검사하기
  if (!req.user) {
    next(createAuthError(401, "UNAUTHORIZED", "인증이 필요합니다."));
    return;
  }

  if (req.user.role !== "ADMIN") {
    next(createAuthError(403, "ADMIN_REQUIRED", "관리자 권한이 필요합니다."));
    return;
  }

  next();
}

/**
 * 인증된 사용자는 접근하지 못하도록 하고 게스트 요청만 통과시킵니다.
 */
export function requireGuest(req: Request, res: Response, next: NextFunction): void {
  // 토큰을 받았아서 undefined를 원하되 안되어도 문자열까지 검사하기
  const token = getBearerToken(req);

  if (!token) {
    next();
    return;
  }

  try {
    // accesstoekn (request.headers.authorizations) 을 뽑아보기
    const payload = readAccessTokenPayload(token, env.JWT_SECRET);

    // payload가 존재하며 idx가 존재하고, role가 존재하면 guest가 아니라고 판단하고 409 충돌 에러 내주기
    if (payload && typeof payload.idx === "number" && isUserRole(payload.role)) {
      next(createAuthError(409, "ALREADY_AUTHENTICATED", "이미 로그인된 사용자입니다."));
      return;
    }

    next();
  } catch {
    next();
  }
}
