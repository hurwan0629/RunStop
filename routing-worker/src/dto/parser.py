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
    # 임시 요청값 설정해주기
    start = (37.4979, 127.0276)   # 강남역
    end = (37.5045, 127.0400)     # 역삼 방향, 직선 약 1.3km (ONE_WAY 용, 목표 3km 보다 짧아야 함)

    weights = {"distance": 5, "elevation": 4, "toilet": 5,
               "store": 2, "park": 3, "night": 5}
    requirements = {"toilet": True, "no_stairs": True}

    cases = [
        ("LOOP", 3.0, {}),
        ("ONE_WAY", 3.0, {"end": end}),
        ("ROUND_TRIP", 3.0, {}),
        ("LOOP", 5.0, {"vias": [(37.5045, 127.0490)]}),   # 선릉역 경유 순환 5km
    ]

    result["top_k"] = node_req.maxCandidates
    result["route_type"] = node_req.routeType

    result["start"] = node_req.startPoint.lat, node_req.startPoint.lng
    result["vias"] = [(p.lat, p.lng) for p in node_req.waypoints]
    result["end"] = (node_req.endPoint.lat, node_req.endPoint.lng) if result["route_type"] == "ONE_WAY" else None

    result["target_km"] = node_req.elementConditions.targetDistance

    result["weights"] = node_req.elementConditions.weights
    result["requirements"] = node_req.elementConditions.requirements

    return result
