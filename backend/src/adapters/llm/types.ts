export type LlmMode = "mock" | "api" | "local";

/**
 * 사용자 요청에서 꺼내주는 내용들
 */
export type RouteConditionParseInput = {
  prompt: string;
  routeType?: "LOOP" | "ONE_WAY" | "ROUND_TRIP";
  targetDistance?: number;
  weights?: Record<string, number>;
  requirements?: Record<string, boolean>;
};

/**
 * llm이 사용자 요구사항으로부터 추출해주는 내용들
 */
export type ParsedRouteConditions = {
  // 가중치
  weights: Record<string, number>;
  // 요구사항
  requirements: Record<string, boolean>;
  // 일반 사용자 프롬프트
  raw?: Record<string, unknown>;
};

// 경로명
export type RouteNamingCandidateInput = {
  candidateIndex: number;
  routeType: "LOOP" | "ONE_WAY" | "ROUND_TRIP";
  distanceKm: number;
  verifiedLandmarks: string[];
  nightRequested: boolean;
  nightScore: number | null;
  elevationGainM: number | null;
  maxSlopePct: number | null;
};

export type RouteNamingInput = {
  candidates: RouteNamingCandidateInput[];
};

export type RouteNamingResult = {
  names: Array<{
    candidateIndex: number;
    name: string;
  }>;
};

/**
 *  구현체의 구현 규칙
 */ 
export type RouteConditionLlmClient = {
  parseRouteConditions(input: RouteConditionParseInput): Promise<ParsedRouteConditions>;

  generateRouteNames(
    input: RouteNamingInput,
  ): Promise<RouteNamingResult>;
};
