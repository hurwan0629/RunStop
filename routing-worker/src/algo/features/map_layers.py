"""추천 완료 후 생성하는 지도 표시 데이터. 점수 계산과 AI 입력에는 사용하지 않는다."""

from math import isfinite

import pandas as pd
from shapely import LineString

from src.algo import config
from src.algo.features.elevation import get_elevation
from src.algo.features.facilities import get_available_night_facility_types
from src.algo.features.nature import _load_nature_layers
from src.algo.types import Coordinate
from src.algo.utils.geo import haversine_m, to_5179, to_4326


def _slope_segments(coords: list[Coordinate]) -> list[dict]:
    # 기존 경사 통계와 같은 간격으로 샘플링하되, 원본 경로의 굴곡을 보존한다.
    indices = [0]
    accumulated_m = 0.0
    for index in range(1, len(coords)):
        accumulated_m += haversine_m(coords[index - 1], coords[index])
        if accumulated_m >= config.SLOPE_SAMPLE_M:
            indices.append(index)
            accumulated_m = 0.0

    if indices[-1] != len(coords) - 1:
        indices.append(len(coords) - 1)

    elevations = [get_elevation(*coords[index]) for index in indices]
    segments = []
    for start, end, low, high in zip(indices, indices[1:], elevations, elevations[1:]):
        distance_m = haversine_m(coords[start], coords[end])
        slope = None
        if (
            low is not None and high is not None
            and isfinite(low) and isfinite(high)
            and distance_m >= config.MIN_SEGMENT_M
        ):
            slope = round(abs(high - low) / distance_m * 100, 2)

        # DEM이 없는 구간은 평지(0%)로 오인하지 않도록 null로 보낸다.
        segments.append({"fromIndex": start, "toIndex": end, "slopePct": slope})
    return segments


def build_map_layers(coords: list[Coordinate]) -> dict:
    slope_segments = _slope_segments(coords) if len(coords) >= 2 else []
    layers = _load_nature_layers()
    availability = {
        "slope": any(segment["slopePct"] is not None for segment in slope_segments),
        "park": layers.get("park") is not None,
        "water": layers.get("water") is not None,
    }
    nature_segments = []
    nature_counts = {kind: 0 if availability[kind] else None for kind in ("park", "water")}

    # 경로 전체가 아니라 공원·하천에서 50m 이내에 있는 실제 선 구간만 추출한다.
    if len(coords) >= 2:
        route_line = LineString([to_5179.transform(lng, lat) for lat, lng in coords])
        route_buffer = route_line.buffer(config.NATURE_BUFFER_M)

        for kind in ("park", "water"):
            layer = layers.get(kind)
            if layer is None:
                continue

            indices = layer.sindex.query(route_buffer, predicate="intersects")
            if len(indices) == 0:
                continue

            # 같은 이름의 공원·하천은 한 번만 센다. 이름이 없으면 원본 ID를 사용한다.
            identities = set()
            for _, feature in layer.iloc[indices].iterrows():
                name = feature.get("name")
                source_id = feature.get("id")
                if pd.notna(name) and str(name).strip():
                    identity = ("name", str(name).strip())
                elif pd.notna(source_id):
                    identity = (str(feature.get("element", "")), str(source_id))
                else:
                    identity = ("geometry", feature.geometry.wkb)
                identities.add(identity)
            nature_counts[kind] = len(identities)

            nearby_area = layer.geometry.iloc[indices].union_all().buffer(config.NATURE_BUFFER_M)
            clipped = route_line.intersection(nearby_area)
            parts = list(clipped.geoms) if hasattr(clipped, "geoms") else [clipped]

            for part in parts:
                if part.geom_type != "LineString" or part.is_empty:
                    continue

                path = []
                for x, y in part.coords:
                    lng, lat = to_4326.transform(x, y)
                    path.append({"lat": lat, "lng": lng})
                nature_segments.append({"type": kind, "path": path})

    return {
        "slopeSegments": slope_segments,
        "natureSegments": nature_segments,
        "natureCounts": nature_counts,
        "availability": availability,
        "nightFacilityTypes": get_available_night_facility_types(),
    }
