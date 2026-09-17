import type { Request, Response, Router } from "express";
import { getRouteConditionLlmClient } from "../adapters/llm/llm.client.js";
import { routeRequestSchema } from "../dto/route/route-request.dto.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { ApiError } from "../middleware/error.js";

export function registerDevTestRouter(router: Router): void {
  router.get("/api/dev/recommend-python-request-dto", asyncHandler(async (req: Request, res: Response) => {
    // 사용자 코스 추천 요청이 현재 route DTO 형식에 맞는지 먼저 확인합니다.
    const parseResult = routeRequestSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new ApiError({
        status: 400,
        code: "INVALID_ROUTE_RECOMMEND_REQUEST",
        message: "코스 추천 요청 값이 올바르지 않습니다.",
        details: parseResult.error.flatten(),
      });
    }

    // 기존 요청 객체를 기준으로 두고, prompt가 있을 때만 LLM 결과를 반영합니다.
    let routeRequest = parseResult.data;

    // 프롬프트가 있을 경우에만 프롬프트 파싱
    if (routeRequest.prompt) {
      // 자연어 prompt를 Python worker가 이해하는 weights / requirements 후보로 변환합니다.
      const parsedConditions = await getRouteConditionLlmClient().parseRouteConditions({
        // 프롬프트
        prompt: routeRequest.prompt,
        // 총 거리
        targetDistance: routeRequest.elementConditions.targetDistance,
        // 가중치
        // 필수로 들어갔으면 하는 내용들
      });

      // LLM 결과가 있으면 기존 weights / requirements와 병합하지 않고 교체합니다.
      routeRequest = {
        ...routeRequest,
        elementConditions: {
          ...routeRequest.elementConditions,
          weights: {
            ...parsedConditions.weights,
            ...routeRequest.elementConditions.weights,
          },
          requirements: {
            ...parsedConditions.requirements,
            ...routeRequest.elementConditions.requirements,
          },
        },
      };
    }

    // dev-test 용도로 LLM 추출 결과까지 반영된 최종 worker 요청 형태를 반환합니다.
    res.json({
      success: true,
      data: routeRequest,
    });
  }));
}
