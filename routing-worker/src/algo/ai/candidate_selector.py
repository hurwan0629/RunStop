from src.algo.types import CandidateRoute, Requirements, Weights


def _to_ai_requirements(
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
) -> Requirements:
    ai_requirements = dict(requirements or {})
    preferences = facility_preferences or {}

    if preferences.get("toilet") == "PREFER":
        ai_requirements["toilet"] = True

    if preferences.get("store") == "PREFER":
        ai_requirements["store"] = True

    return ai_requirements


def select_candidates_with_ai(
    candidates: list[CandidateRoute],
    weights: Weights | None,
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
    top_k: int,
) -> list[CandidateRoute]:
    """
    AI candidate selection layer.

    The current fallback keeps the existing condition_score ordering.
    facility_preferences are converted to AI-compatible requirements only at
    the AI boundary so the routing contract stays unchanged.
    """
    return sorted(
        candidates,
        key=lambda candidate: candidate["condition_score"],
        reverse=True,
    )[:top_k]
