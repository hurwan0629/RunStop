import { ApiError } from "../../../middleware/error.js";
import {
  ROUTE_CONDITION_SYSTEM_PROMPT,
  buildRouteConditionPrompt,
} from "../prompt.js";
import { normalizeRouteConditionText } from "../json.js";
import type {
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
} from "../types.js";

export class LocalLlmClient implements RouteConditionLlmClient {
  constructor(
    private readonly url = process.env.LLM_LOCAL_URL ?? "http://localhost:11434/api/generate",
    private readonly model = process.env.LLM_LOCAL_MODEL ?? "llama3.1",
  ) {}

  async parseRouteConditions(input: RouteConditionParseInput): Promise<ParsedRouteConditions> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: `${ROUTE_CONDITION_SYSTEM_PROMPT}\n\n${buildRouteConditionPrompt(input)}`,
        stream: false,
        format: "json",
      }),
    });

    if (!response.ok) {
      throw new ApiError({
        status: 502,
        code: "LOCAL_LLM_REQUEST_FAILED",
        message: "로컬 LLM 호출에 실패했습니다.",
        details: { status: response.status },
      });
    }

    const json = await response.json() as { response?: string };
    return normalizeRouteConditionText(json.response ?? JSON.stringify(json));
  }
}
