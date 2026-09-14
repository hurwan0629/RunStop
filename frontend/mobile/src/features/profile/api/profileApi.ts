import { apiRequest } from '@/services/api/client';

import type {
  MyPageSummary,
  UpdateProfileRequest,
  UpdateProfileResponse,
  WithdrawResponse,
} from '../types';

export function getMyPageSummary(accessToken: string) {
  return apiRequest<MyPageSummary>('/api/users/me/mypage', {
    accessToken,
  });
}

export function withdrawCurrentUser(accessToken: string) {
  return apiRequest<WithdrawResponse>('/api/users/me', {
    method: 'DELETE',
    accessToken,
  });
}

export function updateCurrentUser(
  accessToken: string,
  input: UpdateProfileRequest,
) {
  return apiRequest<UpdateProfileResponse>('/api/users/me', {
    method: 'PATCH',
    accessToken,
    body: input,
  });
}
