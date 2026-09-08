export interface LoginRequest {
  loginId: string;
  password: string;
}

export interface LoginIdCheckRequest {
  loginId: string;
}

export interface LoginIdCheckResponse {
  available: boolean;
}

export interface PhoneVerificationSendRequest {
  phone: string;
}

export interface PhoneVerificationSendResponse {
  verificationId: string;
  expiresInSec: number;
}

export interface PhoneVerificationVerifyRequest {
  verificationId: string;
  code: string;
}

export interface PhoneVerificationVerifyResponse {
  verified: true;
}

export interface FindIdResponse {
  loginId: string;
}

export interface PasswordResetPhoneVerificationSendRequest {
  loginId: string;
  phone: string;
}

export interface PasswordResetRequest {
  verificationId: string;
  newPassword: string;
}

export interface PasswordResetResponse {
  reset: true;
}

export interface AuthUser {
  idx: number;
  nickname: string;
  role: 'USER' | 'ADMIN';
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface SignupProfile {
  weightKg?: number;
  heightCm?: number;
}

export interface SignupRequest {
  loginId: string;
  password: string;
  nickname: string;
  phone: string;
  verificationId: string;
  profile?: SignupProfile;
}

export type SignupResponse = LoginResponse;
