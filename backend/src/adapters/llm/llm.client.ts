import { ApiLlmClient } from "./implements/llm.api.js";
import { LocalLlmClient } from "./implements/llm.local.js";
import { MockLlmClient } from "./implements/llm.mock.js";
import { env } from "../../config/env.js";
import type {
  LlmMode,
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
  RouteNamingInput,
  RouteNamingResult,
} from "./types.js";

export type {
  LlmMode,
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
  RouteNamingInput,
  RouteNamingResult,
} from "./types.js";

export function createRouteConditionLlmClient(
  mode: LlmMode = env.LLM_MODE,
): RouteConditionLlmClient {
  if (mode === "api") return new ApiLlmClient();
  if (mode === "local") return new LocalLlmClient();
  return new MockLlmClient();
}

const llmClient = createRouteConditionLlmClient();

export function getRouteConditionLlmClient(): RouteConditionLlmClient {
  return llmClient;
}

/**
 * 자연어 러닝 요구사항을 구조화된 경로 조건으로 변환합니다.
 */
export async function parseRouteConditions(
  input: RouteConditionParseInput,
): Promise<ParsedRouteConditions> {
  return llmClient.parseRouteConditions(input);
}

// llm 코스명 만들기
/**
 * 검증된 후보 코스 정보를 바탕으로 코스 이름을 생성합니다.
 */
export async function generateRouteNames(
  input: RouteNamingInput,
): Promise<RouteNamingResult> {
  return llmClient.generateRouteNames(input);
}
