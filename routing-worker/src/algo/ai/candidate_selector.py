from src.algo.types import CandidateRoute, Requirements, Weights


def select_candidates_with_ai(
    candidates: list[CandidateRoute],
    weights: Weights | None,
    requirements: Requirements | None,
    top_k: int,
) -> list[CandidateRoute]:
    """
    [2026-09-10 22:47:47]
    AI 후보 선택 계층.
    현재는 AI 연동 전이므로 기존 condition_score 정렬 방식을 그대로 사용합니다.
    """
    return sorted(
        candidates,
        key=lambda candidate: candidate["condition_score"],
        reverse=True,
    )[:top_k]
