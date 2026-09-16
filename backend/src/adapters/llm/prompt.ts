import type {
  RouteConditionParseInput, RouteNamingInput,
} from "./types.js";

export const ROUTE_CONDITION_SYSTEM_PROMPT = [
  "사용자의 러닝 경로 요청을 routing-worker 조건 JSON으로 변환한다.",
  "반드시 JSON만 반환한다.",
  "반환 형식: {\"weights\": Record<string, 1|2|3|4|5>, \"requirements\": Record<string, boolean|number>}",
  "weights 키: distance, elevation, safety, night, nature, park, surface, flow, overlap, toilet, store",
  "requirements 키: toilet, store, park, no_stairs, max_slope_pct, max_slope, maxSlope",
].join("\n");

/**
 * 사용자의 경로 생성 요청 입력을 바탕으로 LLM 프롬프트 문자열을 만듭니다.
 */
export function buildRouteConditionPrompt(input: RouteConditionParseInput): string {
  return JSON.stringify({
    prompt: input.prompt,
    routeType: input.routeType,
    targetDistance: input.targetDistance,
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

  "코스 이름은 12~28자 사이의 자연스러운 한국어 제목입니다.",
  "문장형 표현이나 추천 표현을 사용하지 않습니다.",
  "코스의 실제 특징을 나타내는 짧고 자연스러운 수식어를 이름 앞부분에 1개만 사용할 수 있습니다.",
  "수식어는 제공된 사실 데이터에서 직접 추론 가능한 특징만 표현해야 합니다.",

  "광고 문구, 이모지, 느낌표 등의 기호를 사용하면 안됩니다.",
  "최고의, 완벽한, 추천하는 등의 과장 표현을 사용하면 안됩니다.",
  "후보별 이름은 서로 달라야 합니다.",
  "수식어는 코스의 물리적 특징을 설명하는 표현보다, 해당 특징으로부터 느껴지는 러닝 감각을 표현하는 단어를 우선합니다.",

  "좋은 예: 시원한 9.9km 러닝 코스, 편안한 10km 순환 러닝 코스, 탁 트인 한강변 러닝 코스",
  "나쁜 예: 완벽한 순환 러닝코스입니다, 편안한 러닝 코스를 추천해드려요",

  '반환 형식: {"names":[{"candidateIndex":0,"name":"시원한 9.9km 러닝 코스"}]}',
].join("\n");

export function buildRouteNamingPrompt(
  input: RouteNamingInput,
): string {
  return JSON.stringify(input);
}