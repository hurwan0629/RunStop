import { env } from "../../../config/env.js";
import { ApiError } from "../../../middleware/error.js";
import {
  normalizeRouteConditionJson,
  normalizeRouteConditionText,
  normalizeRouteNamingJson,
  normalizeRouteNamingText,
} from "../json.js";
import {
  ROUTE_CONDITION_SYSTEM_PROMPT,
  ROUTE_NAMING_SYSTEM_PROMPT,
  buildRouteConditionPrompt,
  buildRouteNamingPrompt,
} from "../prompt.js";
import type {
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
  RouteNamingInput,
  RouteNamingResult,
} from "../types.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export class ApiLlmClient implements RouteConditionLlmClient {
  constructor(
    private readonly url = env.LLM_API_URL,
    private readonly apiKey = env.LLM_API_KEY,
    private readonly model = env.LLM_MODEL,
  ) {}

  async parseRouteConditions(
    input: RouteConditionParseInput,
  ): Promise<ParsedRouteConditions> {
    const json = await this.requestJson(
      [
        { role: "system", content: ROUTE_CONDITION_SYSTEM_PROMPT },
        { role: "user", content: buildRouteConditionPrompt(input) },
      ],
      "LLM_API_REQUEST_FAILED",
      "LLM API 호출에 실패했습니다.",
    );

    const content = this.extractContent(json);

    return typeof content === "string"
      ? normalizeRouteConditionText(content)
      : normalizeRouteConditionJson(content);
  }

  async generateRouteNames(
    input: RouteNamingInput,
  ): Promise<RouteNamingResult> {
    const json = await this.requestJson(
      [
        { role: "system", content: ROUTE_NAMING_SYSTEM_PROMPT },
        { role: "user", content: buildRouteNamingPrompt(input) },
      ],
      "LLM_NAMING_API_REQUEST_FAILED",
      "코스 이름 생성 LLM 호출에 실패했습니다.",
    );

    const content = this.extractContent(json);

    return typeof content === "string"
      ? normalizeRouteNamingText(content)
      : normalizeRouteNamingJson(content);
  }

  private assertConfigured(): void {
    if (!this.url) {
      throw new ApiError({
        status: 500,
        code: "LLM_CONFIG_MISSING",
        message: "LLM API 설정이 누락되었습니다.",
        details: { env: "LLM_API_URL" },
      });
    }

    if (!this.apiKey) {
      throw new ApiError({
        status: 500,
        code: "LLM_CONFIG_MISSING",
        message: "LLM API 설정이 누락되었습니다.",
        details: { env: "LLM_API_KEY" },
      });
    }
  }

  private async requestJson(
    messages: ChatMessage[],
    errorCode: string,
    errorMessage: string,
  ): Promise<unknown> {
    this.assertConfigured();

    const response = await fetch(this.url!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      throw new ApiError({
        status: 502,
        code: errorCode,
        message: errorMessage,
        details: {
          status: response.status,
          body: body.slice(0, 500),
        },
      });
    }

    return response.json() as Promise<unknown>;
  }

  private extractContent(value: unknown): unknown {
    const json = value as {
      choices?: Array<{ message?: { content?: unknown } }>;
      output?: unknown;
    };

    return json.choices?.[0]?.message?.content ?? json.output ?? value;
  }
}
