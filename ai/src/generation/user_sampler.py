"""Read existing users. Never regenerate or overwrite the supplied JSON."""
import json
import math
from pathlib import Path

WEIGHTS = ("distance", "elevation", "toilet", "store", "night", "park", "flow", "surface", "overlap", "safety", "nature")
REQUIREMENTS = ("toilet", "store", "park", "no_stairs", "max_slope_pct")


def numeric(value, label, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{label}: {low}..{high} 범위의 유한 숫자가 필요합니다")
    return value


def check_weights(weights):
    if not isinstance(weights, dict) or not weights or set(weights) - set(WEIGHTS):
        raise ValueError(f"지원하지 않는 가중치: {weights}")
    for key, value in weights.items():
        numeric(value, key, 0, 5)
    if sum(weights.values()) == 0:
        raise ValueError("가중치 합은 0보다 커야 합니다")
    return dict(weights)


def load_users(path, expected_users=None, expected_requests=None):
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
