from src.algo.types import CandidateRoute, Requirements, Weights
from src.algo.ai.artifact_ranker import score_candidates_with_artifact


def select_candidates_with_ai(
    candidates: list[CandidateRoute],
    weights: Weights | None,
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
    top_k: int,
) -> list[CandidateRoute]:
    """
    AI candidate selection layer.

    The bundled artifact is allowed to reorder candidates only after the
    routing/scoring pipeline has produced complete candidate features.
    """
    try:
        scores = score_candidates_with_artifact(
            candidates,
            weights,
            requirements,
            facility_preferences,
        )
        ranked = [
            candidate
            for _, candidate in sorted(
                zip(scores, candidates),
                key=lambda item: item[0],
                reverse=True,
            )
        ]
        return ranked[:top_k]
    except Exception as error:
        print(f"[AI] artifact ranking fallback: {error}")

    return sorted(
        candidates,
        key=lambda candidate: candidate["condition_score"],
        reverse=True,
    )[:top_k]
