import { ApiError } from "../../../middleware/error.js";
import {
  normalizeRouteConditionText,
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

export class LocalLlmClient implements RouteConditionLlmClient {
  constructor(
    private readonly url =
      process.env.LLM_LOCAL_URL ?? "http://localhost:11434/api/generate",
    private readonly model = process.env.LLM_LOCAL_MODEL ?? "llama3.1",
  ) {}

  async parseRouteConditions(
    input: RouteConditionParseInput,
  ): Promise<ParsedRouteConditions> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: `${ROUTE_CONDITION_SYSTEM_PROMPT}\n\n${buildRouteConditionPrompt(input)}`,
        stream: false,
        think: false,
        format: {
          type: "object",
          properties: {
            weights: {
              type: "object",
              properties: {
                distance: { type: "integer", minimum: 1, maximum: 5 },
                elevation: { type: "integer", minimum: 1, maximum: 5 },
                safety: { type: "integer", minimum: 1, maximum: 5 },
                toilet: { type: "integer", minimum: 1, maximum: 5 },
                store: { type: "integer", minimum: 1, maximum: 5 },
                nature: { type: "integer", minimum: 1, maximum: 5 },
                park: { type: "integer", minimum: 1, maximum: 5 },
                night: { type: "integer", minimum: 1, maximum: 5 },
                surface: { type: "integer", minimum: 1, maximum: 5 },
                flow: { type: "integer", minimum: 1, maximum: 5 },
                overlap: { type: "integer", minimum: 1, maximum: 5 },
              },
              additionalProperties: false,
            },
            requirements: {
              type: "object",
              properties: {
                toilet: { type: "boolean" },
                store: { type: "boolean" },
                park: { type: "boolean" },
                no_stairs: { type: "boolean" },
                max_slope_pct: { type: "number" },
                max_slope: { type: "number" },
                maxSlope: { type: "number" },
              },
              additionalProperties: false,
            },
          },
          required: ["weights", "requirements"],
          additionalProperties: false,
        },
        options: {
          temperature: 0,
        },
      }),
    });

    if (!response.ok) {
      throw new ApiError({
        status: 502,
        code: "LOCAL_LLM_REQUEST_FAILED",
        message: "로컬 LLM 조건 해석에 실패했습니다.",
        details: { status: response.status },
      });
    }

    const json = await response.json() as { response?: string };

    return normalizeRouteConditionText(
      json.response ?? JSON.stringify(json),
    );
  }

  async generateRouteNames(
    input: RouteNamingInput,
  ): Promise<RouteNamingResult> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: `${ROUTE_NAMING_SYSTEM_PROMPT}\n\n${buildRouteNamingPrompt(input)}`,
        stream: false,
        think: false,
        format: "json",
        options: {
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new ApiError({
        status: 502,
        code: "LOCAL_LLM_NAMING_REQUEST_FAILED",
        message: "로컬 LLM 코스 이름 생성에 실패했습니다.",
        details: { status: response.status },
      });
    }

    const json = await response.json() as { response?: string };

    return normalizeRouteNamingText(
      json.response ?? JSON.stringify(json),
    );
  }
}