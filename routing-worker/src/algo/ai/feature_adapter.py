from __future__ import annotations

from typing import Any

from src.algo.types import CandidateRoute, Requirements, Weights


WEIGHT_KEYS = (
    "distance",
    "elevation",
    "flow",
    "nature",
    "night",
    "overlap",
    "park",
    "safety",
    "store",
    "surface",
    "toilet",
)


def _number(value: Any, default: float = 0.0) -> float:
    if isinstance(value, bool):
        return float(value)
    if isinstance(value, (int, float)):
        return float(value)
    return default


def _weight(weights: Weights | None, key: str) -> float:
    values = weights or {}
    if key == "safety":
        return _number(values.get("safety", values.get("night", 3)), 3.0)
    if key == "nature":
        return _number(values.get("nature", values.get("park", 3)), 3.0)
    return _number(values.get(key, 3), 3.0)


def _requirements_for_ai(
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
) -> dict[str, Any]:
    values = dict(requirements or {})
    preferences = facility_preferences or {}

    if preferences.get("toilet") == "PREFER":
        values["toilet"] = True
    if preferences.get("store") == "PREFER":
        values["store"] = True

    return values


def _route_type_flags(candidate: CandidateRoute) -> dict[str, float]:
    mode = candidate.get("mode")
    is_loop = mode == "loop"
    is_one_way = mode == "point_to_point"
    is_round_trip = mode == "out_and_back"

    if mode == "via":
        coords = candidate.get("coords") or []
        if len(coords) >= 2:
            first, last = coords[0], coords[-1]
            is_one_way = abs(first[0] - last[0]) + abs(first[1] - last[1]) > 0.0001
            is_loop = not is_one_way

    return {
        "request_type_loop": float(is_loop),
        "request_type_one_way": float(is_one_way),
        "request_type_round_trip": float(is_round_trip),
    }


def build_ai_feature_rows(
    candidates: list[CandidateRoute],
    weights: Weights | None,
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
) -> list[dict[str, float | None]]:
    ai_requirements = _requirements_for_ai(requirements, facility_preferences)
    rows: list[dict[str, float | None]] = []

    for candidate in candidates:
        slope = candidate.get("slope") or {}
        facilities = candidate.get("facilities") or {}
        nature = candidate.get("nature") or {}
        surface = candidate.get("surface") or {}

        row: dict[str, float | None] = {
            "candidate_actual_distance_m": _number(candidate.get("actual_distance_m")),
            "candidate_distance_error_pct": _number(candidate.get("distance_error_pct")),
            "candidate_estimated_minutes": _number(candidate.get("estimated_minutes")),
            "candidate_exact_match": _number(candidate.get("exact_match")),
            "candidate_overlap_ratio": _number(candidate.get("overlap_ratio")),
            "candidate_target_distance_m": _number(candidate.get("target_distance_m")),
            "request_target_distance_m": _number(candidate.get("target_distance_m")),
            "request_via_count": 1.0 if candidate.get("mode") == "via" else 0.0,
            "requirements_max_slope_pct": _number(ai_requirements.get("max_slope_pct")),
            "requirements_no_stairs": _number(ai_requirements.get("no_stairs")),
            "requirements_park": _number(ai_requirements.get("park")),
            "requirements_store": _number(ai_requirements.get("store")),
            "requirements_toilet": _number(ai_requirements.get("toilet")),
        }

        row.update(_route_type_flags(candidate))

        for key in WEIGHT_KEYS:
            value = _weight(weights, key)
            row[f"request_weight_{key}"] = value
            row[f"user_weight_{key}"] = value

        for key, value in slope.items():
            row[f"candidate_slope_{key}"] = _number(value) if value is not None else None

        for key, value in facilities.items():
            row[f"candidate_facilities_{key}"] = _number(value) if value is not None else None

        for key, value in nature.items():
            if key.endswith("_names"):
                continue
            row[f"candidate_nature_{key}"] = _number(value) if value is not None else None

        for key, value in surface.items():
            row[f"candidate_surface_{key}"] = _number(value) if value is not None else None

        rows.append(row)

    return rows
