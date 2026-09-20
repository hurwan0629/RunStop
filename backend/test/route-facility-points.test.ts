import { expect, test } from "vitest";
import { routeDetailSchema, routeFacilityPointsSchema, routeMapLayersSchema } from "../src/dto/route/route-detail.dto.js";

test("시설이 없는 과거 경로는 빈 목록으로 반환한다", () => {
  expect(routeFacilityPointsSchema.parse(undefined)).toEqual([]);
  expect(routeFacilityPointsSchema.parse([])).toEqual([]);
});

test("시설 종류와 좌표를 검증하고 지도용 정보를 보존한다", () => {
  const point = { type: "toilet", name: "공중화장실", lat: 37.5, lng: 127 };
  expect(routeFacilityPointsSchema.parse([point])).toEqual([point]);
  for (const type of ["light", "security", "cctv", "walklight"]) {
    expect(routeFacilityPointsSchema.parse([{ ...point, type }])[0].type).toBe(type);
  }
  for (const invalid of [
    { ...point, type: "park" },
    { ...point, lat: 91 },
    { ...point, lng: 181 },
    { ...point, lat: NaN },
  ]) {
    expect(routeFacilityPointsSchema.safeParse([invalid]).success).toBe(false);
  }
});

test("옛 경로의 레이어 부재와 새 경로의 구간 데이터를 구분한다", () => {
  expect(routeMapLayersSchema.parse(undefined)).toBeNull();
  const layers = {
    slopeSegments: [{ fromIndex: 0, toIndex: 3, slopePct: null }],
    natureSegments: [{ type: "park", path: [{ lat: 37.5, lng: 127 }, { lat: 37.51, lng: 127 }] }],
    availability: { slope: false, park: true, water: false },
    nightFacilityTypes: ["light", "security"],
  };
  expect(routeMapLayersSchema.parse(layers)).toEqual(layers);
  expect(routeMapLayersSchema.parse({ ...layers, natureCounts: { park: 2, water: null } }).natureCounts)
    .toEqual({ park: 2, water: null });
  expect(routeMapLayersSchema.safeParse({ ...layers, natureCounts: { park: -1, water: 0 } }).success)
    .toBe(false);

  const detail = {
    idx: 1, name: "코스", totalDistance: 100, totalAscent: null,
    slopeStd: null, slope: null, isBookmarked: false, points: [],
    path: layers.natureSegments[0].path,
  };
  expect(routeDetailSchema.parse(detail).mapLayers).toBeNull();
  expect(routeDetailSchema.safeParse({ ...detail, mapLayers: layers }).success).toBe(false);
  expect(routeDetailSchema.safeParse({
    ...detail,
    mapLayers: { ...layers, slopeSegments: [{ fromIndex: 0, toIndex: 1, slopePct: 5 }] },
  }).success).toBe(true);

  for (const invalid of [
    { ...layers, slopeSegments: [{ fromIndex: 3, toIndex: 1, slopePct: 5 }] },
    { ...layers, slopeSegments: [{ fromIndex: 0, toIndex: 1, slopePct: -1 }] },
    { ...layers, natureSegments: [{ type: "water", path: [{ lat: 37.5, lng: 127 }] }] },
    { ...layers, nightFacilityTypes: ["unknown"] },
  ]) {
    expect(routeMapLayersSchema.safeParse(invalid).success).toBe(false);
  }
});
