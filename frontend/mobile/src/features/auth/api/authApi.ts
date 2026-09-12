/** TODO: /api/auth 경로의 인증 API 요청 함수를 정의합니다. */
import { apiRequest } from '@/services/api/client';

import type {
  FindIdResponse,
  LoginIdCheckRequest,
  LoginIdCheckResponse,
  LoginRequest,
  LoginResponse,
  PasswordResetPhoneVerificationSendRequest,
  PasswordResetRequest,
  PasswordResetResponse,
  PhoneVerificationSendRequest,
  PhoneVerificationSendResponse,
  PhoneVerificationVerifyRequest,
  PhoneVerificationVerifyResponse,
  SignupRequest,
  SignupResponse,
} from '../types';

export function login(
  input: LoginRequest,
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: input,
  });
}

export function checkLoginId(
  input: LoginIdCheckRequest,
): Promise<LoginIdCheckResponse> {
  return apiRequest<LoginIdCheckResponse>(
    '/api/auth/check-login-id',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function sendSignupPhoneVerification(
  input: PhoneVerificationSendRequest,
): Promise<PhoneVerificationSendResponse> {
  return apiRequest<PhoneVerificationSendResponse>(
    '/api/auth/phone/send',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function verifySignupPhoneCode(
  input: PhoneVerificationVerifyRequest,
): Promise<PhoneVerificationVerifyResponse> {
  return apiRequest<PhoneVerificationVerifyResponse>(
    '/api/auth/phone/verify',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function signup(
  input: SignupRequest,
): Promise<SignupResponse> {
  return apiRequest<SignupResponse>('/api/auth/signup', {
    method: 'POST',
    body: input,
  });
}

export function sendFindIdPhoneVerification(
  input: PhoneVerificationSendRequest,
): Promise<PhoneVerificationSendResponse> {
  return apiRequest<PhoneVerificationSendResponse>(
    '/api/auth/find-id/phone/send',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function verifyFindIdPhoneCode(
  input: PhoneVerificationVerifyRequest,
): Promise<FindIdResponse> {
  return apiRequest<FindIdResponse>(
    '/api/auth/find-id/phone/verify',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function sendPasswordResetPhoneVerification(
  input: PasswordResetPhoneVerificationSendRequest,
): Promise<PhoneVerificationSendResponse> {
  return apiRequest<PhoneVerificationSendResponse>(
    '/api/auth/password/phone/send',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function verifyPasswordResetPhoneCode(
  input: PhoneVerificationVerifyRequest,
): Promise<PhoneVerificationVerifyResponse> {
  return apiRequest<PhoneVerificationVerifyResponse>(
    '/api/auth/password/phone/verify',
    {
      method: 'POST',
      body: input,
    },
  );
}

export function resetPassword(
  input: PasswordResetRequest,
): Promise<PasswordResetResponse> {
  return apiRequest<PasswordResetResponse>(
    '/api/auth/password/reset',
    {
      method: 'POST',
      body: input,
    },
  );
}
