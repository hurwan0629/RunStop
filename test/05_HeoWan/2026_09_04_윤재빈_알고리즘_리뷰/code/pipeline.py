"""
전체 파이프라인 — 요청 1건 -> 추천 코스 목록.

candidates(후보 풀) -> 각 후보에 elevation(경사) + scoring(시설)
+ nature(녹지·하천 인접률) + surface(노면·흐름) 부착 -> weighting(conditionScore)
-> 상위 top_k 반환.

routeType 매핑:  LOOP -> loop  |  ONE_WAY -> point_to_point  |  ROUND_TRIP -> out_and_back
API 서버는 다음 단계 (이 recommend() 를 HTTP 로 감싸면 됨).
"""

import networkx as nx

from candidates import generate_candidates, dedup
from course import generate_course_via
from elevation import slope_profile
from scoring import score_route
from nature import adjacency_ratios
from surface import profile as surface_profile
from weighting import score_candidate

_MODE = {
    "LOOP": "loop",
    "ONE_WAY": "point_to_point",
    "ROUND_TRIP": "out_and_back",
}


def _via_candidates(G, idx, mode, start, target_m, end, vias, n_directions, pool=8):
    """사용자 경유지가 있을 때: 우회점 방향(bearing)만 바꿔가며 후보 풀 생성.
    상위 3개 컷은 안 함 — recommend 가 conditionScore 매긴 뒤 자른다."""
    tail = end if mode == "point_to_point" else None   # LOOP/ROUND_TRIP 는 시작점 복귀
    out = []
    # 360 / 방위 각도로 시작점을 모두 구해보기
    for k in range(n_directions):
        try:
            # nodes와 coords배열 2개와 함께 점수 측정 지표들을 반환
            r = generate_course_via(G, idx, start, vias, target_m, end=tail,
                                    bearing=360.0 * k / n_directions) # bearing = 방위 돌려가면서 확인하는 각도
        except (ValueError, nx.NetworkXException):
            continue
        if r["distance_error_pct"] <= 10:
            out.append(r)
    # 현재 정렬 기준은 (도로 겹침 비율, 거리 오차 비율)
    out.sort(key=lambda r: (r["overlap_ratio"], r["distance_error_pct"]))
    return dedup(out)[:pool]


def recommend(G, idx, route_type, start, target_km, end=None, vias=None,
              weights=None, requirements=None, n_directions=12, top_k=3):
    # 후보군은 3개로 산출 및 가능한 방향은 총 12가지
    # vias: list[(lat, lon)]와 end(위경도 좌표)
    
    # 전역 상수로 저장되어있는 _MODE에서 값 가져와주기. 없으면 None를 반환하여 방어코드 역할을 해주기도 함
    mode = _MODE.get(route_type)
    if mode is None:
        raise ValueError(f"route_type 은 {list(_MODE)} 중 하나 (받음: {route_type})")
    # 모드가 ONE_WAY: point_to_point 인데 end 값이 없으면 막아주기
    if mode == "point_to_point" and end is None:
        raise ValueError("ONE_WAY 는 end 좌표가 필요합니다")

    # 미터로 변환해주기
    target_m = target_km * 1000
    # 경유지가 존재한다면 
    if vias:
        # vias를 받는 전용 함수를 받아주기
        # vias 유무에 대한 함수를 따로 만든 이유는 우회점을 자동으로 추가하는 로직이 추가로 들어가야하기 때문.
        # 또한 동일한 도로를 달리는 overlap_ratio <= 0.35 에 대한 체크를 하지 않음
        cands = _via_candidates(G, idx, mode, start, target_m, end, vias, n_directions)
    else:
        cands = generate_candidates(G, idx, mode, start, target_m,
                                    end=end, n_directions=n_directions)

    # 산출된 후보군에서 점수를 측정한 다음에 
    for c in cands:
        c["slope"] = slope_profile(c["coords"])          # 경사 (DEM)
        c["facilities"] = score_route(c["coords"])        # 시설 (CSV)
        c["nature"] = adjacency_ratios(c["coords"])       # 녹지·하천 인접률 (OSM 폴리곤)
        c["surface"] = surface_profile(G, c["nodes"])     # 노면·흐름 (OSM 엣지/노드)
        score_candidate(c, weights, requirements)         # sub_scores + conditionScore
        c.pop("nodes", None)                              # 내부용, 응답엔 불필요

    cands.sort(key=lambda c: c["condition_score"], reverse=True)
    return cands[:top_k]          # 풀에 점수 매긴 뒤 상위 top_k 만


if __name__ == "__main__":
    from pathlib import Path
    from graph import NodeIndex

    graphml = Path(__file__).parent / "data" / "서울_보행네트워크.graphml"
    # 그래프 파일이 존재하면 
    if graphml.exists():
        from graph import load_graph
        # 그래프 도로망 데이터를 불러와주기
        print(f"[그래프] 실제 서울 도로망: {graphml.name}")
        # 그래프 객체를 만든다음에 `기존 이름.pkl` 형태로 변환해서 저장해주기
        G = load_graph(str(graphml))
    else:
        # 그래프 파일이 없다면 
        from graph import grid_graph
        print("[그래프] 격자 (build_graph.py 로 실제 그래프 빌드 가능)")
        G = grid_graph(90, 90, 100, origin=(37.475, 126.985))

    # G의 인덱스를 캐싱하여 (lat, lon)을 넣으면 가장 가까운 인덱스를 반환해주는 idx 노드 인덱스 객체를 가져와주기
    idx = NodeIndex(G)


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

    # rt = MODE, km = 거리, kw = 가중치들  > (경유지 및 거리 관련 함수)
    for rt, km, kw in cases:
        # 경유지가 있는경우와 없는 경우에 대해서 설정해주기
        label = rt + (f" +경유지{len(kw['vias'])}" if kw.get("vias") else "")
        print(f"\n== {label} {km}km ==")
        # 전체 노드와 인덱스, route_type, 시작 위치, 거리, 가중치, 요구사항, kw를 
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
