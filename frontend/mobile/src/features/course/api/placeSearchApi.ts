import { apiRequest } from '@/services/api/client';

import type { PlaceSearchResponse } from '../types';

/**
 * 네이버 Local Search는 백엔드에서 호출합니다.
 * 앱에는 RunStop 백엔드의 검색 결과만 전달되므로 API 시크릿이 노출되지 않습니다.
 */
export function searchPlaces(accessToken: string, query: string) {
  return apiRequest<PlaceSearchResponse>(
    `/api/places/search?query=${encodeURIComponent(query)}`,
    { accessToken },
  );
}
