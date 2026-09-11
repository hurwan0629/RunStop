import {
  ROUTE_CONDITION_SYSTEM_PROMPT,
  buildRouteConditionPrompt,
} from "../prompt.js";
import { normalizeRouteConditionJson, normalizeRouteConditionText } from "../json.js";
import { ApiError } from "../../../middleware/error.js";
import type {
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
} from "../types.js";

export class ApiLlmClient implements RouteConditionLlmClient {
  constructor(
    private readonly url = process.env.LLM_API_URL,
    private readonly apiKey = process.env.LLM_API_KEY,
    private readonly model = process.env.LLM_MODEL ?? "gpt-4o-mini",
  ) {}

  async parseRouteConditions(input: RouteConditionParseInput): Promise<ParsedRouteConditions> {
    if (!this.url) {
      throw new ApiError({
        status: 500,
        code: "LLM_CONFIG_MISSING",
        message: "LLM API 설정이 누락되었습니다.",
        details: { env: "LLM_API_URL" },
      });
    }

    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: ROUTE_CONDITION_SYSTEM_PROMPT },
          { role: "user", content: buildRouteConditionPrompt(input) },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      throw new ApiError({
        status: 502,
        code: "LLM_API_REQUEST_FAILED",
        message: "LLM API 호출에 실패했습니다.",
        details: { status: response.status },
      });
    }

    const json = await response.json() as unknown;
    const content = this.extractContent(json);
    return typeof content === "string"
      ? normalizeRouteConditionText(content)
      : normalizeRouteConditionJson(content);
  }

  private extractContent(value: unknown): unknown {
    const json = value as {
      choices?: Array<{ message?: { content?: unknown } }>;
      output?: unknown;
    };

    return json.choices?.[0]?.message?.content ?? json.output ?? value;
  }
}
