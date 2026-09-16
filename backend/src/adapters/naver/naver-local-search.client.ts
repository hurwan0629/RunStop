import { z } from "zod";
import { ApiError } from "../../middleware/error.js";
import type { PlaceSearchResponse } from "../../dto/place/place-search.dto.js";

type NaverApiHubCredentials = {
  clientId: string;
  clientSecret: string;
};

const naverLocalSearchResponseSchema = z.object({
  items: z.array(
    z.object({
      title: z.string(),
      category: z.string().optional(),
      address: z.string().optional(),
      roadAddress: z.string().optional(),
      mapx: z.union([z.string(), z.number()]),
      mapy: z.union([z.string(), z.number()]),
    }),
  ),
});

/**
 * 네이버 응답 제목에 포함될 수 있는 <b> 태그를 제거합니다.
 */
function removeHtmlTags(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim();
}

/**
 * API HUB 좌표를 숫자 위도·경도로 변환합니다.
 * 현재 API 값과 과거 E7 형식 값 모두 처리합니다.
 */
function parseCoordinate(
  value: string | number,
  type: "latitude" | "longitude",
): number {
  const originalValue = Number(value);

  if (!Number.isFinite(originalValue)) {
    throw new ApiError({
      status: 502,
      code: "NAVER_API_HUB_INVALID_RESPONSE",
      message: "장소 검색 결과의 좌표 형식이 올바르지 않습니다.",
    });
  }

  const coordinate =
    Math.abs(originalValue) > 1000
      ? originalValue / 10_000_000
      : originalValue;

  const isValid =
    type === "latitude"
      ? coordinate >= -90 && coordinate <= 90
      : coordinate >= -180 && coordinate <= 180;

  if (!isValid) {
    throw new ApiError({
      status: 502,
      code: "NAVER_API_HUB_INVALID_RESPONSE",
      message: "장소 검색 결과의 좌표 범위가 올바르지 않습니다.",
    });
  }

  return coordinate;
}

/**
 * NCP NAVER API HUB 지역 검색 API를 호출합니다.
 */
export async function searchNaverLocalPlaces(
  query: string,
  credentials: NaverApiHubCredentials,
): Promise<PlaceSearchResponse> {
  const params = new URLSearchParams({
    query,
    display: "5",
    start: "1",
    sort: "random",
    format: "json",
  });

  let response: Response;

  try {
    response = await fetch(
      `https://naverapihub.apigw.ntruss.com/search/v1/local?${params.toString()}`,
      {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": credentials.clientId,
          "X-NCP-APIGW-API-KEY": credentials.clientSecret,
        },
      },
    );
  } catch {
    throw new ApiError({
      status: 502,
      code: "NAVER_API_HUB_REQUEST_FAILED",
      message: "장소 검색 서비스에 연결하지 못했습니다.",
    });
  }

  if (!response.ok) {
    throw new ApiError({
      status: 502,
      code: "NAVER_API_HUB_REQUEST_FAILED",
      message: "장소 검색 서비스를 호출하지 못했습니다.",
    });
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new ApiError({
      status: 502,
      code: "NAVER_API_HUB_INVALID_RESPONSE",
      message: "장소 검색 서비스의 응답을 읽지 못했습니다.",
    });
  }

  const parseResult = naverLocalSearchResponseSchema.safeParse(body);

  if (!parseResult.success) {
    throw new ApiError({
      status: 502,
      code: "NAVER_API_HUB_INVALID_RESPONSE",
      message: "장소 검색 서비스의 응답 형식이 올바르지 않습니다.",
    });
  }

  return {
    items: parseResult.data.items.map((item) => ({
      name: removeHtmlTags(item.title),
      category: item.category?.trim() ?? "",
      address: item.address?.trim() ?? "",
      roadAddress: item.roadAddress?.trim() ?? "",
      longitude: parseCoordinate(item.mapx, "longitude"),
      latitude: parseCoordinate(item.mapy, "latitude"),
    })),
  };
}