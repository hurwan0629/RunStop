import { expect, test } from "vitest";
import { routeRequestSchema } from "../src/dto/route/route-request.dto.js";
import { workerRouteRequestSchema } from "../src/dto/worker/worker-route-request.dto.js";

const request = {
  routeType: "LOOP", startPoint: { lat: 37.5, lng: 127 },
  elementConditions: {
    targetDistance: 5000, slopePreference: "GENTLE", preferNature: false, preferFlow: false,
    facilityPreferences: { toilet: "PREFER", store: "IGNORE" },
    weights: { distance: 5, nature: 5, park: 5, flow: 5, overlap: 0, night: 4, unknown: 5 },
  },
};

test("새 UI 선택은 기본 가중치로 되살아나지 않으며 거리·중복은 내부 기준이다", () => {
  const parsed = routeRequestSchema.parse(request);
  expect(parsed.elementConditions.maxSlope).toBe(5);
  expect(parsed.elementConditions.weights).toEqual({ distance: 3, nature: 0, park: 0, flow: 0, night: 4, elevation: 5 });
  expect(parsed.elementConditions.requirements).toEqual({});
  expect(parsed.elementConditions.facilityPreferences).toEqual({ toilet: "PREFER", store: "IGNORE" });
});

test("완만/약간 경사짐/상관없음과 Node 경사 완화가 worker 직전에도 보존된다", () => {
  for (const [slopePreference, maxSlope] of [["GENTLE", 5], ["NORMAL", 8], ["ANY", undefined]] as const) {
    const parsed = routeRequestSchema.parse({ ...request, elementConditions: {
      ...request.elementConditions, slopePreference, preferNature: true, preferFlow: true,
    } });
    expect(parsed.elementConditions.maxSlope).toBe(maxSlope);
    expect(parsed.elementConditions.weights.park).toBe(5);
    expect(parsed.elementConditions.weights.flow).toBe(5);
    for (const applied of [12, undefined]) {
      const worker = workerRouteRequestSchema.parse({ ...parsed, elementConditions: { ...parsed.elementConditions, maxSlope: applied } });
      expect(worker.elementConditions.maxSlope).toBe(applied);
      expect(worker.elementConditions.slopePreference).toBe(slopePreference);
    }
  }
});

test("기존 요청과 0 가중치를 유지하고 잘못된 선택은 거절한다", () => {
  const legacy = routeRequestSchema.parse({ ...request, elementConditions: {
    targetDistance: 3000, facilityPreferences: { toilet: "IGNORE", store: "IGNORE" },
    weights: { flow: 0, distance: 4 },
  } });
  expect(legacy.elementConditions.weights).toEqual({ flow: 0, distance: 4 });
  expect(routeRequestSchema.safeParse({ ...request, elementConditions: { ...request.elementConditions, preferNature: "false" } }).success).toBe(false);
});
