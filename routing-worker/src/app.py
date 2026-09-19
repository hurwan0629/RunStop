from datetime import datetime
import json
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI

from .algo.pipeline import recommend
from .algo.utils.graph import NodeIndex, grid_graph, load_graph
from .dto.parser import (
    parse_node_request_to_python_recommendation,
    parse_python_recommendation_to_node_require,
)
from .dto.recommend import RouteRecommendRequestDTO
from .dto.track import TrackAnalysisRequest
from .algo.features.map_layers import build_map_layers
from .algo.features.elevation import analyze_elevation_profile
from .algo.features.facilities import get_nearby_facility_points


def log(level: str, message: str, data: dict | None = None) -> None:
    timestamp = datetime.now().isoformat(timespec="milliseconds")
    print(f"[{timestamp}] [{level}] {message}", flush=True)

    if data:
        print(json.dumps(data, ensure_ascii=False, indent=2, default=str), flush=True)


graphml = Path(__file__).parent / "algo" / "data" / "서울_보행네트워크.graphml"
if graphml.exists():
    log("INFO", "graph:load", {"graphml": graphml.name})
    G = load_graph(str(graphml))
else:
    log("WARN", "graph:fallback_grid")
    G = grid_graph(90, 90, 100, origin=(37.475, 126.985))

idx = NodeIndex(G)

app = FastAPI()


@app.post("/routes/analyze-track")
def analyze_track(request: TrackAnalysisRequest):
    # 기록 조회 전용 분석이다. 경로 생성·AI 순위 결정은 실행하지 않는다.
    results = []
    for segment in request.segments:
        coords = [(point.lat, point.lng) for point in segment]
        slope = analyze_elevation_profile(coords)
        results.append({
            "facilityPoints": get_nearby_facility_points(coords),
            "mapLayers": build_map_layers(coords),
            "slope": {
                "avgSlopePct": slope["avg_slope_pct"],
                "maxSlopePct": slope["max_slope_pct"],
                "slopeStdPct": slope["slope_std_pct"],
                "elevationGainM": slope["elevation_gain_m"],
                "elevationLossM": slope["elevation_loss_m"],
                "sampleCount": slope["sample_count"],
            },
        })
    return results


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/routes/recommend")
def route_recommend(request: RouteRecommendRequestDTO):
    request_id = uuid4().hex[:8]
    # 시작용 카운터
    started_at = perf_counter()

    # 인자 로깅
    log("INFO", "routes/recommend:start", {
        "request_id": request_id,
        "route_type": request.routeType,
        "target_distance_m": request.elementConditions.targetDistance,
        "max_slope": request.elementConditions.maxSlope,
        "waypoint_count": len(request.waypoints),
        "has_end_point": request.endPoint is not None,
        "has_prompt": bool(request.prompt),
        "max_candidates": request.maxCandidates,
        "weight_keys": sorted(request.elementConditions.weights),
        "requirement_keys": sorted(request.elementConditions.requirements),
        "facility_preferences": request.elementConditions.facilityPreferences,
    })

    # 
    parse_started_at = perf_counter()
    recommend_args = parse_node_request_to_python_recommendation(request)
    log("INFO", "routes/recommend:parsed", {
        "request_id": request_id,
        "duration_ms": round((perf_counter() - parse_started_at) * 1000),
        "route_type": recommend_args["route_type"],
        "start": recommend_args["start"],
        "end": recommend_args.get("end"),
        "via_count": len(recommend_args.get("vias") or []),
        "target_km": recommend_args["target_km"],
        "requirements": recommend_args.get("requirements") or {},
        "facility_preferences": recommend_args.get("facility_preferences") or {},
    })

    recommend_started_at = perf_counter()
    cands = recommend(
        G,
        idx,
        recommend_args["route_type"],
        recommend_args["start"],
        recommend_args["target_km"],
        end=recommend_args.get("end", None),
        vias=recommend_args.get("vias", None),
        weights=recommend_args.get("weights", None),
        requirements=recommend_args.get("requirements", None),
        facility_preferences=recommend_args.get("facility_preferences"),
        n_directions=12,
        top_k=3,
        request_id=request_id,
    )
    log("INFO", "routes/recommend:recommended", {
        "request_id": request_id,
        "duration_ms": round((perf_counter() - recommend_started_at) * 1000),
        "candidate_count": len(cands),
        "candidates": [
            {
                "index": index,
                "distance_m": cand.get("actual_distance_m"),
                "score": cand.get("condition_score"),
                "point_count": len(cand.get("coords") or []),
                "failed_conditions": cand.get("failed_conditions") or [],
            }
            for index, cand in enumerate(cands)
        ],
    })

    response_started_at = perf_counter()
    response = parse_python_recommendation_to_node_require(cands)
    log("INFO", "routes/recommend:response", {
        "request_id": request_id,
        "duration_ms": round((perf_counter() - response_started_at) * 1000),
        "candidate_count": len(response),
        "path_point_counts": [
            len(candidate.get("path") or [])
            for candidate in response
        ],
        "total_duration_ms": round((perf_counter() - started_at) * 1000),
    })

    return {"candidates": response}
