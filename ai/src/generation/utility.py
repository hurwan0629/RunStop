"""raw feature로 합성 정답 utility를 만듭니다. condition_score/sub_scores는 쓰지 않습니다.

preference_v1은 관측된 사용자 정답이 아니라 명시적으로 설정한 가설입니다.
누락 feature는 설정된 기본 만족도로 처리하고, 최종 점수는 [0, 1] 범위로 자릅니다.
"""
import math
from typing import Any
from ai.src.config.schema import UtilityConfig


def utility_score(
    candidate: dict[str, Any],
    profile_weights: dict[str, float],
    request: dict[str, Any],
    config: UtilityConfig,
) -> float:
    """후보 경로 하나가 사용자/요청 선호에 얼마나 맞는지 0~1 utility로 계산합니다."""
    p = config.params
    missing = p.missing_satisfaction

    def measure(section, key):
        """후보 dict에서 숫자 측정값을 꺼내고 음수는 0으로 보정합니다."""
        value = candidate.get(section, {}).get(key) if section else candidate.get(key)
        if value is None:
            return None
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
            raise ValueError(f"Invalid candidate measure: {section}.{key}")
        return max(0.0, float(value))

    def decay(value, scale):
        """작을수록 좋은 값에 쓰는 감소형 만족도입니다."""
        return missing if value is None else math.exp(-value / scale)

    def saturation(value, scale):
        """클수록 좋지만 한계효용이 줄어드는 값에 쓰는 만족도입니다."""
        return missing if value is None else 1 - math.exp(-value / scale)

    def ratio(value):
        """이미 0~1 비율인 값을 만족도로 사용합니다."""
        return missing if value is None else min(1.0, value)

    # 거리, 야간 안전, 흐름, 자연 접근성을 raw feature에서 만족도로 변환합니다.
    target = request["target_km"] * 1000
    actual = measure("", "actual_distance_m")
    distance = missing if actual is None else math.exp(-((actual / target - 1) / p.distance_tolerance_ratio) ** 2)
    lighting = [measure("facilities", key + "_per_km") for key in ("light", "security", "walklight", "cctv")]
    night = saturation(sum(v for v in lighting if v is not None), p.night_scale_per_km) if any(v is not None for v in lighting) else missing
    signals = measure("surface", "signal_per_km")
    crossings = measure("surface", "crossing_per_km")
    flow = decay(signals + crossings, p.flow_scale_per_km) if signals is not None and crossings is not None else missing
    park = max(ratio(measure("nature", "park_ratio")), ratio(measure("nature", "water_ratio")))

    # weight 키별 만족도를 구성합니다.
    sats = {"distance": distance, "elevation": decay(measure("slope", "avg_slope_pct"), p.slope_scale_pct),
            "toilet": saturation(measure("facilities", "toilet_per_km"), p.facility_scale_per_km),
            "store": saturation(measure("facilities", "store_per_km"), p.facility_scale_per_km),
            "night": night, "safety": night, "park": park, "nature": park, "flow": flow,
            "surface": ratio(measure("surface", "walkable_ratio")),
            "overlap": 1 - ratio(measure("", "overlap_ratio")) if measure("", "overlap_ratio") is not None else missing}

    # 사용자 기본 선호와 요청별 선호를 profile_share 비율로 섞습니다.
    weights = {key: p.profile_share * profile_weights.get(key, 0) + (1 - p.profile_share) * request["weights"].get(key, 0) for key in sats}
    total = sum(weights.values())
    if total <= 0:
        raise ValueError("Utility requires positive preference weights")
    score = sum(weights[k] * sats[k] for k in sats) / total

    # hard requirement 위반은 utility에서 고정 penalty로 차감합니다.
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


def label_candidates(candidates: list[dict[str, Any]], job: dict[str, Any], config: UtilityConfig) -> list[dict[str, float]]:
    """후보 목록에 utility, ground_truth_rank, relevance label을 붙입니다."""
    # 후보별 utility를 계산하고, 같은 점수는 같은 dense rank를 부여합니다.
    values = [utility_score(c, job["profile"]["weights"], job["args"], config) for c in candidates]
    ranks = {value: rank for rank, value in enumerate(sorted(set(values), reverse=True), 1)}
    return [{"utility": value, "ground_truth_rank": ranks[value],
             "relevance": min(config.relevance_levels - 1, int(value * config.relevance_levels))} for value in values]
