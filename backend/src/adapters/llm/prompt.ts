import type {
  RouteConditionParseInput, RouteNamingInput,
} from "./types.js";

export const ROUTE_CONDITION_SYSTEM_PROMPT = [
  "사용자의 러닝 경로 요청을 routing-worker 조건 JSON으로 변환한다.",
  "반드시 JSON만 반환한다.",
  "반환 형식: {\"weights\": Record<string, 1|2|3|4|5>, \"requirements\": Record<string, boolean>}",
  "weights 키: distance, elevation, toilet, store, park, night, surface, flow, overlap",
  "requirements 키: toilet, store, park, no_stairs, max_slope_pct",
].join("\n");

/**
 * 사용자의 경로 생성 요청 입력을 바탕으로 LLM 프롬프트 문자열을 만듭니다.
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

// 경로명 생성 llm 프롬프트
export const ROUTE_NAMING_SYSTEM_PROMPT = [
  "당신은 러닝 코스 이름을 생성하는 역할입니다.",
  "반드시 JSON만 반환합니다.",
  "제공된 사실 데이터 외의 지명, 시설, 시간대, 특징을 임의로 만들면 안됩니다.",
  "verifiedLandmarks가 비어있을 시, 지명을 언급하면 안됩니다.",
  "nightRequested가 false이면 야간, 저녁, 밤을 언급하면 안됩니다.",
  "routeType이 LOOP일때만 순환이라는 표현을 사용할 수 있습니다.",
  "코스 이름은 12~28자 사이의 자연스러운 한국어입니다.",
  "광고 문구, 이모지, 느낌표 등의 기호를 사용하면 안됩니다.",
  "후보별 이름은 서로 달라야 합니다.",
  '반환 형식: {"names":[{"candidateIndex":0,"name":"한강변을 달리는 저녁 러닝 코스"}]}',
].join("\n");

export function buildRouteNamingPrompt(
  input: RouteNamingInput,
): string {
  return JSON.stringify(input);
}