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
<<<<<<< HEAD

        think: false,

        format: {
          type: "object",
          properties: {
            weights: {
                type: "object",
                properties: {
                  distance: { type: "integer", minimum: 1, maximum: 5 },
                  elevation: { type: "integer", minimum: 1, maximum: 5 },
                  toilet: { type: "integer", minimum: 1, maximum: 5 },
                  store: { type: "integer", minimum: 1, maximum: 5 },
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
            },
          },
          required: ["weights", "requirements"],
          additionalProperties: false,
        },

        options: {
          temperature: 0,
        },
      }),
      
      
      // 초기 body 요구사항
      // JSON.stringify({
      //   model: this.model,
      //   prompt: `${ROUTE_CONDITION_SYSTEM_PROMPT}\n\n${buildRouteConditionPrompt(input)}`,
      //   stream: false,
      //   format: "json",
      // }),
=======
        format: "json",
      }),
>>>>>>> 6617e8543fc403ac9a5278ab5a1678198a005ffd
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
<<<<<<< HEAD

=======
>>>>>>> 6617e8543fc403ac9a5278ab5a1678198a005ffd
