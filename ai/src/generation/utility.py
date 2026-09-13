"""Synthetic ground truth from RAW features, never condition_score/sub_scores.

preference_v1 is an explicit, configurable hypothesis, not observed user truth.
Missing measures receive a configurable satisfaction; scores are clipped to [0,1].
"""
import math
from ai.src.config.schema import UtilityConfig


def utility_score(candidate, profile_weights, request, config: UtilityConfig):
    p = config.params
    missing = p.missing_satisfaction

    def measure(section, key):
        value = candidate.get(section, {}).get(key) if section else candidate.get(key)
        if value is None:
            return None
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid candidate measure: {section}.{key}")
        return max(0.0, float(value))

    def decay(value, scale):
        return missing if value is None else math.exp(-value / scale)

    def saturation(value, scale):
        return missing if value is None else 1 - math.exp(-value / scale)

    def ratio(value):
        return missing if value is None else min(1.0, value)

    target = request["target_km"] * 1000
    actual = measure("", "actual_distance_m")
    distance = missing if actual is None else math.exp(-((actual / target - 1) / p.distance_tolerance_ratio) ** 2)
    lighting = [measure("facilities", key + "_per_km") for key in ("light", "security", "walklight", "cctv")]
    night = saturation(sum(v for v in lighting if v is not None), p.night_scale_per_km) if any(v is not None for v in lighting) else missing
    signals = measure("surface", "signal_per_km")
    crossings = measure("surface", "crossing_per_km")
    flow = decay(signals + crossings, p.flow_scale_per_km) if signals is not None and crossings is not None else missing
    park = max(ratio(measure("nature", "park_ratio")), ratio(measure("nature", "water_ratio")))
    sats = {"distance": distance, "elevation": decay(measure("slope", "avg_slope_pct"), p.slope_scale_pct),
            "toilet": saturation(measure("facilities", "toilet_per_km"), p.facility_scale_per_km),
            "store": saturation(measure("facilities", "store_per_km"), p.facility_scale_per_km),
            "night": night, "safety": night, "park": park, "nature": park, "flow": flow,
            "surface": ratio(measure("surface", "walkable_ratio")),
            "overlap": 1 - ratio(measure("", "overlap_ratio")) if measure("", "overlap_ratio") is not None else missing}
    weights = {key: p.profile_share * profile_weights.get(key, 0) + (1 - p.profile_share) * request["weights"].get(key, 0) for key in sats}
    total = sum(weights.values())
    if total <= 0:
        raise ValueError("Utility requires positive preference weights")
    score = sum(weights[k] * sats[k] for k in sats) / total
    violations = 0
    for key, required in request.get("requirements", {}).items():
        if required is False:
            continue
        if key in {"toilet", "store"}:
            value = measure("facilities", key + "_count")
            violated = value is None or value < 1
        elif key == "park":
            values = [measure("nature", "park_ratio"), measure("facilities", "park_count")]
            violated = not any(v is not None and v > 0 for v in values)
        elif key == "no_stairs":
            value = measure("surface", "stairs_count")
            violated = value is None or value > 0
        elif key == "max_slope_pct":
            value = measure("slope", "max_slope_pct")
            violated = value is None or value > required
        else:
            raise ValueError(f"Unknown requirement {key}")
        violations += int(violated)
    return round(max(0.0, min(1.0, score - violations * p.requirement_violation_penalty)), config.tie_decimals)


def label_candidates(candidates, job, config):
    values = [utility_score(c, job["profile"]["weights"], job["args"], config) for c in candidates]
    ranks = {value: rank for rank, value in enumerate(sorted(set(values), reverse=True), 1)}
    return [{"utility": value, "ground_truth_rank": ranks[value],
             "relevance": min(config.relevance_levels - 1, int(value * config.relevance_levels))} for value in values]
