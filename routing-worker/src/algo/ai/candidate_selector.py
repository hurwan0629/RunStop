from src.algo.types import CandidateRoute, Requirements, Weights


FACILITY_KEYS = ("toilet", "store")

def _facility_count(candidate: CandidateRoute, key: str) -> int:
    facilities = candidate.get("facilities") or {}
    value = facilities.get(f"{key}_count", 0)

    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0

def _facility_status(
    candidate: CandidateRoute,
    facility_preferences: dict[str, str],
) -> dict[str, str]:
    statuses: dict[str, str] = {}

    for key in FACILITY_KEYS:
        preference = facility_preferences.get(key, "IGNORE")

        if preference != "PREFER":
            statuses[key] = "IGNORE"
        elif _facility_count(candidate, key) > 0:
            statuses[key] = "MET"
        else:
            statuses[key] = "RELAXED"

    return statuses

def _candidate_sort_key(
    candidate: CandidateRoute,
    facility_preferences: dict[str, str],
) -> tuple[int, int, float]:
    preferred_keys = [
        key
        for key in FACILITY_KEYS
        if facility_preferences.get(key, "IGNORE") == "PREFER"
    ]

    # 선택한 시설이 없는 개수
    # 0: 전부 충족 / 1: 하나 부족 / 2: 둘 다 부족
    missing_count = sum(
        _facility_count(candidate, key) == 0
        for key in preferred_keys
    )

    # 선택한 시설의 총 개수
    # 같은 충족 단계에서는 시설이 많은 코스를 우선
    preferred_facility_count = sum(
        _facility_count(candidate, key)
        for key in preferred_keys
    )

    condition_score = float(candidate.get("condition_score", 0.0))

    return (
        missing_count,
        -preferred_facility_count,
        -condition_score,
    )


def select_candidates_with_ai(
    candidates: list[CandidateRoute],
    weights: Weights | None,
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
    top_k: int,
) -> list[CandidateRoute]:
    """
    [2026-09-10 22:47:47]
    AI 후보 선택 계층.
    현재는 AI 연동 전이므로 기존 condition_score 정렬 방식을 그대로 사용합니다.
    """

    """
    후보 선택 계층.

    현재는 LLM 후보 선택 전 단계이며,
    시설 PREFER/IGNORE 정책과 condition_score를 기준으로
    최종 후보를 정렬합니다.
    """

    preferences = facility_preferences or {
        "toilet": "IGNORE",
        "store": "IGNORE",
    }

    for candidate in candidates:
        candidate["facility_status"] = _facility_status(
            candidate,
            preferences,
        )

    return sorted(
        candidates,
        key=lambda candidate: _candidate_sort_key(
            candidate,
            preferences,
        ),
    # return sorted(
    #     candidates,
    #     key=lambda candidate: candidate["condition_score"],
    #     reverse=True,
    )[:top_k]
