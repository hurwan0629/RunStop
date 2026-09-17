import { expect, test } from "vitest";
import { routeFacilityPointsSchema } from "../src/dto/route/route-detail.dto.js";

test("시설이 없는 과거 경로는 빈 목록으로 반환한다", () => {
  expect(routeFacilityPointsSchema.parse(undefined)).toEqual([]);
  expect(routeFacilityPointsSchema.parse([])).toEqual([]);
});

test("시설 종류와 좌표를 검증하고 지도용 정보를 보존한다", () => {
  const point = { type: "toilet", name: "공중화장실", lat: 37.5, lng: 127 };
  expect(routeFacilityPointsSchema.parse([point])).toEqual([point]);
  for (const invalid of [
    { ...point, type: "park" },
    { ...point, lat: 91 },
    { ...point, lng: 181 },
    { ...point, lat: NaN },
  ]) {
    expect(routeFacilityPointsSchema.safeParse([invalid]).success).toBe(false);
  }
});
