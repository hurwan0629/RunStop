import type { Request, Response } from "express";
import {
  placeSearchQuerySchema,
  placeSearchResponseSchema,
} from "../dto/place/place-search.dto.js";
import { ApiError } from "../middleware/error.js";
import { searchPlaces as searchPlacesService } from "../services/place-search.service.js";

/**
 * GET /api/places/search?query=서울숲
 */
export async function searchPlaces(
  req: Request,
  res: Response,
): Promise<void> {
  const parseResult = placeSearchQuerySchema.safeParse(req.query);

  if (!parseResult.success) {
    throw new ApiError({
      status: 400,
      code: "INVALID_PLACE_SEARCH_QUERY",
      message: "장소 검색어가 올바르지 않습니다.",
      details: parseResult.error.flatten(),
    });
  }

  const result = await searchPlacesService(parseResult.data.query);

  res.json({
    success: true,
    data: placeSearchResponseSchema.parse(result),
  });
}