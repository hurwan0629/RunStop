export type LlmMode = "mock" | "api" | "local";

/**
 * 사용자 요청에서 꺼내주는 내용들
 */
export type RouteConditionParseInput = {
  prompt: string;
  routeType?: "LOOP" | "ONE_WAY" | "ROUND_TRIP";
  targetDistance?: number;
  weights?: Record<string, number>;
  requirements?: Record<string, unknown>;
};

/**
 * llm이 사용자 요구사항으로부터 추출해주는 내용들
 */
export type ParsedRouteConditions = {
  // 가중치
  weights: Record<string, number>;
  // 요구사항
  requirements: Record<string, unknown>;
  // 일반 사용자 프롬프트
  raw?: Record<string, unknown>;
};

/**
 *  구현체의 구현 규칙
 */ 
export type RouteConditionLlmClient = {
  parseRouteConditions(input: RouteConditionParseInput): Promise<ParsedRouteConditions>;
};
