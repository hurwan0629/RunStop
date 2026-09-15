from datetime import datetime
import json
from time import perf_counter

from src.algo.types import CandidateRoute, Requirements, Weights
from src.algo.ai.artifact_ranker import score_candidates_with_artifact


def log(level: str, message: str, data: dict | None = None) -> None:
    timestamp = datetime.now().isoformat(timespec="milliseconds")
    print(f"[{timestamp}] [{level}] {message}", flush=True)

    if data:
        print(json.dumps(data, ensure_ascii=False, indent=2, default=str), flush=True)


def summarize_candidate(candidate: CandidateRoute, index: int) -> dict:
    return {
        "index": index,
        "distance_m": candidate.get("actual_distance_m"),
        "score": candidate.get("condition_score"),
        "point_count": len(candidate.get("coords") or []),
        "failed_conditions": candidate.get("failed_conditions") or [],
    }


def select_candidates_with_ai(
    candidates: list[CandidateRoute],
    weights: Weights | None,
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
    top_k: int,
    request_id: str | None = None,
) -> list[CandidateRoute]:
    """
    AI candidate selection layer.

    The bundled artifact is allowed to reorder candidates only after the
    routing/scoring pipeline has produced complete candidate features.
    """
    started_at = perf_counter()
    log("INFO", "ai/select:input", {
        "request_id": request_id,
        "candidate_count": len(candidates),
        "top_k": top_k,
        "weight_keys": sorted(weights or {}),
        "requirement_keys": sorted(requirements or {}),
        "facility_preferences": facility_preferences or {},
    })

    # ai를 이용해서 먼저 뽑아주기
    try:
        # ai를 통해서 cands 점수 정렬해주기
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
        selected = ranked[:top_k]
        log("INFO", "ai/select:output", {
            "request_id": request_id,
            "mode": "artifact",
            "duration_ms": round((perf_counter() - started_at) * 1000),
            "score_min": min(scores) if scores else None,
            "score_max": max(scores) if scores else None,
            "selected_count": len(selected),
            "selected": [
                summarize_candidate(candidate, index)
                for index, candidate in enumerate(selected)
            ],
        })
        return selected
    # ai 활성화가 안되어져있다면 에러내고 일반 select 방식으로 만들기
    except Exception as error:
        log("WARN", "ai/select:fallback", {
            "request_id": request_id,
            "error": str(error),
        })

    selected = sorted(
        candidates,
        key=lambda candidate: candidate["condition_score"],
        reverse=True,
    )[:top_k]
    log("INFO", "ai/select:output", {
        "request_id": request_id,
        "mode": "condition_score",
        "duration_ms": round((perf_counter() - started_at) * 1000),
        "selected_count": len(selected),
        "selected": [
            summarize_candidate(candidate, index)
            for index, candidate in enumerate(selected)
        ],
    })
    return selected
