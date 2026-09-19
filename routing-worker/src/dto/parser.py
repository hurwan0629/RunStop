from .recommend import RouteRecommendRequestDTO
from typing import Any
from src.algo.features.facilities import get_nearby_facility_points
from src.algo.features.map_layers import build_map_layers

def parse_node_request_to_python_recommendation(
    node_req: RouteRecommendRequestDTO
) -> dict[str, Any]:
    """
    Node서버에서 보내는 요청 데이터를 Python recommend() 함수에 들어갈 인자들인
    top_k, route_type, start, vias, end, target_km, weights와 requirements로 만들어줍니다.
    """

    result = dict()
    result["top_k"] = node_req.maxCandidates
    result["route_type"] = node_req.routeType

    result["start"] = node_req.startPoint.lat, node_req.startPoint.lng
    result["vias"] = [(p.lat, p.lng) for p in node_req.waypoints]
    result["end"] = (node_req.endPoint.lat, node_req.endPoint.lng) if result["route_type"] == "ONE_WAY" else None

    result["target_km"] = node_req.elementConditions.targetDistance / 1000.0

    result["weights"] = node_req.elementConditions.weights

    requirements = dict(node_req.elementConditions.requirements)

    if node_req.elementConditions.maxSlope is not None:
        requirements["max_slope_pct"] = node_req.elementConditions.maxSlope

    if node_req.elementConditions.slopePreference is not None:
        requirements["slope_preference"] = node_req.elementConditions.slopePreference

    result["requirements"] = requirements
    result["facility_preferences"] = node_req.elementConditions.facilityPreferences

    return result

def parse_python_recommendation_to_node_require(results):
    candidates = []

    for result in results:
        slope = result.get("slope") or {}

        coords = result["coords"]
        distance_km = result["actual_distance_m"] / 1000

        feature_values = dict(result.get("facilities") or {})
        # 기존 JSON에 진단값만 추가한다. score는 기존 heuristic 의미를 유지한다.
        feature_values.update({
            "distanceErrorPct": result.get("distance_error_pct"),
            "overlapRatio": result.get("overlap_ratio"),
            "aiScore": result.get("ai_score"),
            "rankingSource": result.get("ranking_source"),
            "generationSource": result.get("generation_source", "direction"),
        })
        # AI 선택이 끝난 후보의 응답에만 지도 레이어를 추가한다.
        feature_values["facilityPoints"] = get_nearby_facility_points(coords)
        feature_values["mapLayers"] = build_map_layers(coords)
        feature_values["facilityStatus"] = result.get(
            "facility_status",
            {},
        )

        feature_values["slope"] = {
            "avgSlopePct": slope.get("avg_slope_pct"),
            "maxSlopePct": slope.get("max_slope_pct"),
            "slopeStdPct": slope.get("slope_std_pct"),
            "elevationGainM": slope.get("elevation_gain_m"),
            "elevationLossM": slope.get("elevation_loss_m"),
            "sampleCount": slope.get("sample_count"),
        }

        nature = result.get("nature") or {}

        feature_values["nature"] = {
            "parkRatio": nature.get("park_ratio"),
            "waterRatio": nature.get("water_ratio"),
            "parkNames": nature.get("park_names", []),
            "waterNames": nature.get("water_names", []),
        }
        feature_values["surface"] = result.get("surface") or {}

        candidates.append({
            "name": f"약 {distance_km:.1f}km 러닝 코스",
            "score": result["condition_score"],
            "path": [
                {"lat": coord[0], "lng": coord[1]}
                for coord in result["coords"]
            ],
            "featureScores": result["sub_scores"],
            "featureValues": feature_values,
            "totalDistance": result["actual_distance_m"],
            "totalAscent": slope.get("elevation_gain_m"),
            "slopeStd": slope.get("slope_std_pct"),
            "points": [{
                "sequence": 0,
                "pointType": "START",
                "lat": coords[0][0],
                "lng": coords[0][1],
                "title": "출발지",
            },
            {
                "sequence": 1,
                "pointType": "END",
                "lat": coords[-1][0],
                "lng": coords[-1][1],
                "title": "도착지",
            },
            ],
        })

    return candidates
    
