import type {
  ParsedRouteConditions,
  RouteConditionLlmClient,
  RouteConditionParseInput,
  RouteNamingInput,
  RouteNamingResult,
} from "../types.js";
import type { RouteRequirementValue } from "../../../dto/route/route-request.dto.js";

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

export class MockLlmClient implements RouteConditionLlmClient {
  async parseRouteConditions(input: RouteConditionParseInput): Promise<ParsedRouteConditions> {
    const text = input.prompt.toLowerCase();
    const weights: Record<string, number> = {};
    const requirements: Record<string, RouteRequirementValue> = {};

    if (includesAny(text, ["화장실", "toilet"])) {
      weights.toilet = 5;
      requirements.toilet = true;
    }
    if (includesAny(text, ["편의점", "store", "convenience"])) weights.store = 5;
    if (includesAny(text, ["공원", "숲", "하천", "자연", "park", "nature"])) weights.park = 5;
    if (includesAny(text, ["야간", "밤", "조명", "안전", "cctv", "night"])) weights.night = 5;
    if (includesAny(text, ["경사", "오르막", "언덕", "slope"])) weights.elevation = 5;
    if (includesAny(text, ["계단", "stairs"])) requirements.no_stairs = true;

    return { weights, requirements };
  }

    async generateRouteNames(
    input: RouteNamingInput,
  ): Promise<RouteNamingResult> {
    return {
      names: input.candidates.map((candidate) => {
        const landmark = candidate.verifiedLandmarks[0];
        const routeLabel =
          candidate.routeType === "LOOP" ? "순환 러닝 코스" : "러닝 코스";

        const name = landmark
          ? `${landmark} 인근 ${candidate.distanceKm.toFixed(1)}km ${routeLabel}`
          : `약 ${candidate.distanceKm.toFixed(1)}km ${routeLabel}`;

        return {
          candidateIndex: candidate.candidateIndex,
          name,
        };
      }),
    };
  }
}
