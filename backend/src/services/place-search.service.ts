import { searchNaverLocalPlaces } from "../adapters/naver/naver-local-search.client.js";
import { env } from "../config/env.js";
import type { PlaceSearchResponse } from "../dto/place/place-search.dto.js";
import { ApiError } from "../middleware/error.js";

/**
 * 장소 검색 기능의 비즈니스 로직입니다.
 */
export async function searchPlaces(
  query: string,
): Promise<PlaceSearchResponse> {
  const clientId = env.NAVER_API_HUB_CLIENT_ID;
  const clientSecret = env.NAVER_API_HUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ApiError({
      status: 503,
      code: "NAVER_API_HUB_NOT_CONFIGURED",
      message: "장소 검색 서비스 설정이 완료되지 않았습니다.",
    });
  }

  return searchNaverLocalPlaces(query, {
    clientId,
    clientSecret,
  });
}