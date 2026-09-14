import type { ParsedRouteConditions, RouteNamingResult } from "./types.js";
import { ApiError } from "../../middleware/error.js";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function parseJsonObject(text: string): Record<string, unknown> {
  try {
    return asRecord(JSON.parse(text));
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new ApiError({
        status: 502,
        code: "INVALID_LLM_RESPONSE",
        message: "LLM 응답이 JSON 형식이 아닙니다.",
      });
    }

    try {
      return asRecord(JSON.parse(text.slice(start, end + 1)));
    } catch {
      throw new ApiError({
        status: 502,
        code: "INVALID_LLM_RESPONSE",
        message: "LLM 응답 JSON을 해석할 수 없습니다.",
      });
    }
  }
}

function normalizeWeights(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(asRecord(value))) {
    const numberValue = Number(raw);
    if (Number.isFinite(numberValue)) {
      out[key] = Math.min(5, Math.max(1, Math.round(numberValue)));
    }
  }
  return out;
}

function normalizeRequirements(value: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(asRecord(value))) {
    if (typeof raw === "boolean") {
      out[key] = raw;
    }
  }
  return out;
}

export function normalizeRouteConditionJson(value: unknown): ParsedRouteConditions {
  const raw = asRecord(value);
  const elementConditions = asRecord(raw.elementConditions);
  const source = Object.keys(elementConditions).length > 0 ? elementConditions : raw;

  return {
    weights: normalizeWeights(source.weights),
    requirements: normalizeRequirements(source.requirements),
    raw,
  };
}

export function normalizeRouteConditionText(text: string): ParsedRouteConditions {
  return normalizeRouteConditionJson(parseJsonObject(text));
}

function normalizeRouteName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim().replace(/\s+/g, " ");

  if (name.length < 4 || name.length > 28) {
    return null;
  }

  return name;
}

export function normalizeRouteNamingJson(
  value: unknown,
): RouteNamingResult {
  const raw = asRecord(value);
  const rawNames = Array.isArray(raw.names) ? raw.names : [];

  const seenNames = new Set<string>();
  const names: RouteNamingResult["names"] = [];

  for (const item of rawNames) {
    const record = asRecord(item);
    const candidateIndex = record.candidateIndex;
    const name = normalizeRouteName(record.name);

    if (
      typeof candidateIndex !== "number"
      || !Number.isInteger(candidateIndex)
      || candidateIndex < 0
      || !name
      || seenNames.has(name)
    ) {
      continue;
    }

    seenNames.add(name);
    names.push({ candidateIndex, name });
  }

  return { names };
}

export function normalizeRouteNamingText(
  text: string,
): RouteNamingResult {
  return normalizeRouteNamingJson(parseJsonObject(text));
}