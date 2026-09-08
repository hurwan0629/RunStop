/** TODO: API 기본 주소, 공통 헤더와 액세스 토큰 처리를 구현합니다. */
import { config } from '@/constants/config';
import type {
  ApiErrorResponse,
  ApiSuccessResponse,
} from '@/types/api';

import { ApiRequestError } from './errors';

// http 메서드 타입 정의
type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

// 요청 옵션 정의
// `2026-09-08 17:32:10`
// 현재 기준 프로젝트 auth가 accessToken을 이용하기 때문에 accessToken을 사용
interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  accessToken?: string | null;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.accessToken) {
    headers.Authorization = `Bearer ${options.accessToken}`;
  }

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body:
      options.body === undefined
        ? undefined
        : JSON.stringify(options.body),
  });

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError(
      response.status,
      'INVALID_SERVER_RESPONSE',
      '서버 응답을 처리할 수 없습니다.',
    );
  }

  if (!response.ok) {
    const errorResponse = payload as Partial<ApiErrorResponse>;
    const error = errorResponse.error;

    throw new ApiRequestError(
      response.status,
      error?.code ?? 'UNKNOWN_API_ERROR',
      error?.message ?? '서버 요청에 실패했습니다.',
      error?.details,
    );
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    (payload as Partial<ApiSuccessResponse<T>>).success !== true ||
    !('data' in payload)
  ) {
    throw new ApiRequestError(
      response.status,
      'INVALID_SERVER_RESPONSE',
      '서버 응답 형식이 올바르지 않습니다.',
    );
  }

  return (payload as ApiSuccessResponse<T>).data;
}