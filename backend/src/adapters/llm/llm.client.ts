import { ApiLlmClient } from "./implements/llm.api.js";
import { LocalLlmClient } from "./implements/llm.local.js";
import { MockLlmClient } from "./implements/llm.mock.js";
import type {
  LlmMode,
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
} from "./types.js";

export type {
  LlmMode,
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
} from "./types.js";

export function createRouteConditionLlmClient(
  mode: LlmMode = (process.env.LLM_MODE as LlmMode | undefined) ?? "mock",
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
