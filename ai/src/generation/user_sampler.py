"""기존 사용자 JSON을 읽습니다. 입력 JSON을 다시 만들거나 덮어쓰지 않습니다."""
import json
import math
from pathlib import Path
from typing import Any

WEIGHTS = ("distance", "elevation", "toilet", "store", "night", "park", "flow", "surface", "overlap", "safety", "nature")
REQUIREMENTS = ("toilet", "store", "park", "no_stairs", "max_slope_pct")


def numeric(value: Any, label: str, low: float, high: float) -> float:
    """값이 지정 범위 안의 유한한 숫자인지 확인합니다."""
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{label}: {low}..{high} 범위의 유한 숫자가 필요합니다")
    return value


def check_weights(weights: dict[str, Any]) -> dict[str, float]:
    """사용자/요청 weight dict가 지원하는 키와 값 범위를 지키는지 확인합니다."""
    if not isinstance(weights, dict) or not weights or set(weights) - set(WEIGHTS):
        raise ValueError(f"지원하지 않는 가중치: {weights}")
    for key, value in weights.items():
        numeric(value, key, 0, 5)
    if sum(weights.values()) == 0:
        raise ValueError("가중치 합은 0보다 커야 합니다")
    return dict(weights)


def load_users(
    path: str | Path,
    expected_users: int | None = None,
    expected_requests: int | None = None,
) -> list[dict[str, Any]]:
    """사용자 JSON을 읽고 내부 생성 파이프라인에서 쓰는 표준 구조로 바꿉니다."""
    data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    users = data.get("users")
    if not isinstance(users, list) or not users:
        raise ValueError("users 배열이 비어 있습니다")
    normalized, seen = [], set()
    for user in users:
        uid = user.get("sample_id", user.get("sampleId"))
        if not isinstance(uid, str) or not uid.strip() or uid in seen:
            raise ValueError(f"사용자 ID 누락 또는 중복: {uid}")
        seen.add(uid)
        profile = user["profile"]
        if not isinstance(user.get("requests"), list) or not user["requests"]:
            raise ValueError(f"{uid}: 요청 배열이 비어 있습니다")
        normalized.append({"user_id": uid, "profile": {**profile, "weights": check_weights(profile["weights"])}, "requests": user["requests"]})
    counts = (len(users), sum(len(u["requests"]) for u in users))
    for label, actual, expected, keys in (
        ("users", counts[0], expected_users, ("user_count", "userCount")),
        ("requests", counts[1], expected_requests, ("total_request_count", "totalRequestCount")),
    ):
        if expected is not None and actual != expected:
            raise ValueError(f"{label}: 예상 {expected}, 실제 {actual}")
        for key in keys:
            if key in data and data[key] != actual:
                raise ValueError(f"{key} 메타데이터와 실제 개수가 다릅니다")
    return normalized
