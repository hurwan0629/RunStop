from .recommend import RouteRecommendRequestDTO
from typing import Any

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
    result["requirements"] = node_req.elementConditions.requirements

    return result

def parse_python_recommendation_to_node_require(results):
    return [{
            "name": "임시 코스 명 (파이썬 parser.py 하드코딩)",
            "score": result["condition_score"],
            "path": [{ "lat": coord[0], "lng": coord[1]} for coord in result["coords"]],
            "featureScores": result["sub_scores"],
            "featureValues": result["facilities"],
            "totalDistance": result["actual_distance_m"],
            "totalAscent": result["slope"]["elevation_gain_m"],
            "slopeStd": 999,
            "points": [{
                "sequence": 999,
                "pointType": "END",
                "lat": 90,
                "lng": 180,
                # "title": "END",
                # "elevation": 9999,
                # "slope": 9999,
            }]
            # for num,  waypoint in enumerate(result.waypoint)]
        }
        for result in results]

    