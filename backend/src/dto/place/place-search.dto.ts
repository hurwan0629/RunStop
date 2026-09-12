import { z } from "zod";

/**
 * 프론트가 장소 검색 시 보내는 쿼리 형식입니다.
 */
export const placeSearchQuerySchema = z.object({
  query: z
    .string()
    .trim()
    .min(1, "검색어를 입력해 주세요.")
    .max(100, "검색어는 100자 이하로 입력해 주세요."),
});

/**
 * RunStop이 프론트에 반환하는 장소 한 건의 형식입니다.
 */
export const placeSearchItemSchema = z.object({
  name: z.string().min(1),
  address: z.string(),
  roadAddress: z.string(),
  category: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

/**
 * 장소 검색 API의 응답 data 형식입니다.
 */
export const placeSearchResponseSchema = z.object({
  items: z.array(placeSearchItemSchema),
});

export type PlaceSearchResponse = z.infer<typeof placeSearchResponseSchema>;