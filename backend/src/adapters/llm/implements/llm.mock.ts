import type {
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
} from "../types.js";

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export class MockLlmClient implements RouteConditionLlmClient {
  async parseRouteConditions(input: RouteConditionParseInput): Promise<ParsedRouteConditions> {
    // 반환하기 위한 데이터들
    const text = input.prompt.toLowerCase();
    const weights: Record<string, number> = { ...(input.weights ?? {}) };
    const requirements: Record<string, unknown> = { ...(input.requirements ?? {}) };

    // 텍스트에 존재하는 문자열을 기준으로 처리해주기
    if (includesAny(text, ["화장실", "toilet"])) {
      weights.toilet = 5;
      requirements.toilet = true;
    }
    if (includesAny(text, ["편의점", "store", "convenience"])) weights.store = 5;
    if (includesAny(text, ["공원", "녹지", "하천", "자연", "park", "nature"])) weights.park = 5;
    if (includesAny(text, ["야간", "밤", "조명", "안전", "cctv", "night"])) weights.night = 5;
    if (includesAny(text, ["경사", "오르막", "언덕", "평지", "slope"])) weights.elevation = 5;
    if (includesAny(text, ["계단", "stairs"])) requirements.no_stairs = true;
    
    return { weights, requirements };
  }
}
