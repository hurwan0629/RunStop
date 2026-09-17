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

    # 모든 사용자의 profile의 weight의 범위를 확인합니다.
    for key, value in weights.items():
        numeric(value, key, 0, 5)

    # 사용자는 최소 1 이상의 가중치가 있어야함
    if sum(weights.values()) == 0:
        raise ValueError("가중치 합은 0보다 커야 합니다")
    return dict(weights)


def load_users(
    path: str | Path,
    expected_users: int | None = None,
    expected_requests: int | None = None,
) -> list[dict[str, Any]]:
    """사용자 JSON을 읽고 내부 생성 파이프라인에서 쓰는 표준 구조로 바꿉니다."""

    # json 읽어주기
    data = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    # 사용자 배열 받아오기
    users = data.get("users")
    if not isinstance(users, list) or not users:
        raise ValueError("users 배열이 비어 있습니다")

    # normalized: 검증과 표준화가 끝난 사용자 데이터를 담는 리스트
    # seen: 이미 사용한 user_id를 기억하는 변수
    normalized, seen = [], set()
    for user in users:
        # # # # # # # # [사용자 뽑기] # # # # # # # # # # # # # # # 
        # 보통 U001 과 같이 이루어져있음
        uid = user.get("sample_id", user.get("sampleId"))
        # 중복 체크
        if not isinstance(uid, str) or not uid.strip() or uid in seen:
            raise ValueError(f"사용자 ID 누락 또는 중복: {uid}")
        # 저장
        seen.add(uid)

        # # # # # # # # [프로필 뽑기 (사용자 성향)] # # # # # # # # # # # # # # # 
        profile = user["profile"]
        # 요청 있어야함
        if not isinstance(user.get("requests"), list) or not user["requests"]:
            raise ValueError(f"{uid}: 요청 배열이 비어 있습니다")
        # 사용자 uid에 대해서 profile 추가해주기.
        normalized.append({"user_id": uid, "profile": {**profile, "weights": check_weights(profile["weights"])}, "requests": user["requests"]})

    # 사용자들의 요청 총 개수를 뽑아주기
    counts = (len(users), sum(len(u["requests"]) for u in users))
    # 실제 json의 데이터와 conig에 명시되어있는 데이터 개수 차이 확인해주기
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
