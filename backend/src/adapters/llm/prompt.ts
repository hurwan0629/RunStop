import type { RouteConditionParseInput } from "./types.js";

export const ROUTE_CONDITION_SYSTEM_PROMPT = [
  "사용자 러닝 경로 요청을 routing-worker 조건 JSON으로 변환한다.",
  "반드시 JSON만 반환한다.",
  "반환 형식: {\"weights\": Record<string, 1|2|3|4|5>, \"requirements\": Record<string, unknown>}",
  "weights 예: distance, elevation, toilet, store, park, night, surface, flow, overlap",
  "requirements 예: toilet, store, park, no_stairs, max_slope_pct",
].join("\n");

/**
 * 사용자의 경로 생성 요청 입력을 바탕으로 문자열로 변환시켜주는 함수
 */
export function buildRouteConditionPrompt(input: RouteConditionParseInput): string {
  return JSON.stringify({
    prompt: input.prompt,
    routeType: input.routeType,
    targetDistance: input.targetDistance,
    current: {
      weights: input.weights ?? {},
      requirements: input.requirements ?? {},
    },
  });
}
