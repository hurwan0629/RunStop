import type { LoginRequest } from './types';

/** 로그인 입력값이 비어 있는지 검사합니다. */
export function isLoginInputComplete(input: LoginRequest): boolean {
  return Boolean(input.loginId.trim() && input.password);
}
