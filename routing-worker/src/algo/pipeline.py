"""
전체 파이프라인 — 요청 1건 -> 추천 코스 목록.

candidates(후보 풀) -> 각 후보에 elevation(경사) + scoring(시설)
+ nature(녹지·하천 인접률) + surface(노면·흐름) 부착 -> weighting(conditionScore)
-> 상위 top_k 반환.

routeType 매핑:  LOOP -> loop  |  ONE_WAY -> point_to_point  |  ROUND_TRIP -> out_and_back
API 서버는 다음 단계 (이 recommend() 를 HTTP 로 감싸면 됨).
"""

from typing import Any

import networkx as nx

from src.algo.ai.candidate_selector import select_candidates_with_ai
from src.algo.types import CandidateRoute, Coordinate, Requirements, RouteType, Weights
from src.algo.routing.candidates import generate_candidates, generate_candidates_via
from src.algo.features.elevation import analyze_elevation_profile
from src.algo.features.facilities import analyze_nearby_facilities
from src.algo.features.nature import analyze_nature_adjacency
from src.algo.features.surface import analyze_surface_profile
from src.algo.scoring.weighting import score_candidate

_MODE = {
    "LOOP": "loop",
    "ONE_WAY": "point_to_point",
    "ROUND_TRIP": "out_and_back",
}


def recommend(
    G: nx.Graph,
    idx: Any,
    route_type: RouteType,
    start: Coordinate,
    target_km: float,
    end: Coordinate | None = None,
    vias: list[Coordinate] | None = None,
    weights: Weights | None = None,
    requirements: Requirements | None = None,
    n_directions: int = 12,
    top_k: int = 3,
) -> list[CandidateRoute]:
    mode = _MODE.get(route_type)
    if mode is None:
        raise ValueError(f"route_type 은 {list(_MODE)} 중 하나 (받음: {route_type})")
    if mode == "point_to_point" and end is None:
        raise ValueError("ONE_WAY 는 end 좌표가 필요합니다")

    target_m = target_km * 1000
    if vias:
        # [가중치 설계 변경] 후보 생성 단계부터 선호도와 필수조건을 경로 탐색에 반영한다.
        cands = generate_candidates_via(
            G, idx, mode, start, target_m, end, vias, n_directions,
            weights=weights, requirements=requirements,
        )
    else:
        # print("generate_candidates")
        cands = generate_candidates(G, idx, mode, start, target_m,
                                    end=end, n_directions=n_directions,
                                    weights=weights, requirements=requirements)
        # print("cands:", len(cands))

    for c in cands:
        
        # 경사 (DEM)
        # 모든 node를 검사하지 않고, config.SLOPE_SAMPLE_M 을 기준으로 값을 가져와주기
        # - avg_slope_pct
        # - max_slope_pct
        # - elevation_gain_m: 경사도 총 
        # - sample_count: slope를 계산할 때 사용한 위경도 종류 뽑아주기
        c["slope"] = analyze_elevation_profile(c["coords"])          

         # 시설 (CSV)
        # - f"{key}_count:  
        # - f"{key}_per_km:  
        # - f"{key}_nearest_m 를 가져와주기
        c["facilities"] = analyze_nearby_facilities(c["coords"])

        # 녹지·하천 인접률 (OSM 폴리곤)       
        # f"{nature_type}_ratio": dict[str, float] 반환
        c["nature"] = analyze_nature_adjacency(c["coords"])       

        # 도로 환경 정보 (OSM 엣지/노드)
        # 도로의 유형을 모두 가져와서 비율을 책정해주기
        # - length_m: 총 길이 float
        # - walkable_ratio: 보행자 도로 float
        # - bigroad_ratio: 큰 길 float
        # - stairs_count: 계단 int
        # - signal_per_km: 신호등 km당 개수 비율
        # - crossing_per_km: 횡단보도 km 방 개수 비율
        c["surface"] = analyze_surface_profile(G, c["nodes"])

        # 누적한 slope, facilities, nature, surface를 기준으로 사용자 요청 값인 weights, requirements를 이용해서 비교해주기
        score_candidate(c, weights, requirements)         # sub_scores + conditionScore
        c.pop("nodes", None)                              # 내부용, 응답엔 불필요

    # print("cands_count:", len(cands))
    return select_candidates_with_ai(cands, weights, requirements, top_k)

if __name__ == "__main__":
    from pathlib import Path
    from src.algo.utils.graph import NodeIndex

    graphml = Path(__file__).parent / "data" / "서울_보행네트워크.graphml"
    if graphml.exists():
        from src.algo.utils.graph import load_graph
        print(f"[그래프] 실제 서울 도로망: {graphml.name}")
        G = load_graph(str(graphml))
    else:
        from src.algo.utils.graph import grid_graph
        print("[그래프] 격자 (build_graph.py 로 실제 그래프 빌드 가능)")
        G = grid_graph(90, 90, 100, origin=(37.475, 126.985))
    idx = NodeIndex(G)

    # start = (37.4979, 127.0276)   # 강남역
    start = (37.571806, 127.011287)  # 동대문역
    # end = (37.5045, 127.0400)     # 역삼 방향, 직선 약 1.3km (ONE_WAY 용, 목표 3km 보다 짧아야 함)
    end = (37.571153, 127.009639)  # 흥인지문(동대문)

    # 사용처는 edge_coast.py
    weights = {
        "distance": 5,    # 짧고 목표 거리에 가까운 경로
        "elevation": 4,   # 낮은 경사 선호
        "toilet": 5,      # 화장실 선호
        "store": 2,       # 편의점 선호
        "park": 3,        # 공원·하천 선호
        "night": 5,       # 조명·CCTV 선호
        "surface": 3,     # 보행 친화 노면 선호
        "flow": 2,        # 신호등이 적은 길 선호
        "overlap": 5,     # 같은 길 반복 억제
    }
    requirements = {
        "toilet": True,
        "store": False,
        "park": False,
        "no_stairs": True,
        "max_slope_pct": 8,
    }

    cases = [
        ("LOOP", 3.0, {}),
        ("ONE_WAY", 3.0, {"end": end}),
        ("ROUND_TRIP", 3.0, {}),
        ("LOOP", 5.0, {"vias": [(37.5045, 127.0490)]}),   # 선릉역 경유 순환 5km
    ]
    for rt, km, kw in cases:
        label = rt + (f" +경유지{len(kw['vias'])}" if kw.get("vias") else "")
        print(f"\n== {label} {km}km ==")
        cands = recommend(G, idx, rt, start, km, weights=weights,
                          requirements=requirements, **kw)
        if not cands:
            print("  (후보 없음)")
        for i, c in enumerate(cands, 1):
            ss = c["sub_scores"]
            print(f" {i}. conditionScore {c['condition_score']}  "
                  f"({c['actual_distance_m']}m, {c['estimated_minutes']}분, "
                  f"exact={c['exact_match']})")
            print("    소점수:", {k: v for k, v in ss.items() if v is not None})
            if c["failed_conditions"]:
                print("    미충족:", c["failed_conditions"])
