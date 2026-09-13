"""
generate_course 를 여러 방향(bearing)으로 돌려 후보 풀(pool)을 만든다.

거리 오차·겹침으로 1차로 거르고, 서로 거의 같은 코스는 중복 제거.
최종 "상위 3개" 는 여기서 안 자른다 — pipeline 이 conditionScore 를 매긴 뒤 자른다.
그래야 가중치(조명·공원 등)가 후보 선정에 반영된다.
"""

import networkx as nx

from src.algo.routing.course import generate_course, generate_course_via
from src.algo.routing.shortest_path import path_to_edge_set
from src.algo import config
from src.algo.types import CandidateRoute, Coordinate, NodePath, Requirements, RouteMode, Weights


def _courses_share_too_many_edges(
    a_nodes: NodePath,
    b_nodes: NodePath,
    threshold: float | None = None,
) -> bool:
    """두 코스가 공유한 도로 비율이 threshold 초과면 '같은 코스' 취급.
    threshold=None 이면 config.DEDUP_SIMILARITY."""
    if threshold is None:
        threshold = config.DEDUP_SIMILARITY
        
    ea, eb = path_to_edge_set(a_nodes), path_to_edge_set(b_nodes)
    if not ea or not eb:
        return False
    return len(ea & eb) / min(len(ea), len(eb)) > threshold


def _drop_near_duplicate_courses(cands: list[CandidateRoute]) -> list[CandidateRoute]:
    """앞에서부터 훑으며, 이미 채택한 코스와 너무 비슷하면 버린다."""
    kept = []
    for c in cands:
        if any(_courses_share_too_many_edges(c["nodes"], k["nodes"]) for k in kept):
            continue
        kept.append(c)
    return kept

def generate_candidates_via(
    G,
    idx,
    mode: RouteMode,
    start: Coordinate,
    target_m: float,
    end: Coordinate | None,
    vias: list[Coordinate],
    n_directions: int,
    pool: int = 8,
    weights: Weights | None = None,
    requirements: Requirements | None = None,
) -> list[CandidateRoute]:
    """사용자 경유지가 있을 때: 우회점 방향(bearing)만 바꿔가며 후보 풀 생성.
    상위 3개 컷은 안 함 — recommend 가 conditionScore 매긴 뒤 자른다."""
    tail = end if mode == "point_to_point" else None   # LOOP/ROUND_TRIP 는 시작점 복귀
    out = []
    for k in range(n_directions):
        try:
            r = generate_course_via(G, idx, mode, start, vias, target_m, end=tail,
                                    bearing=360.0 * k / n_directions,
                                    weights=weights, requirements=requirements)
        except (ValueError, nx.NetworkXException):
            continue
        if r["distance_error_pct"] <= config.CAND_DIST_TOL_PCT:
            out.append(r)
    out.sort(key=lambda r: (r["overlap_ratio"], r["distance_error_pct"]))
    return _drop_near_duplicate_courses(out)#[:pool]

def generate_candidates(G, idx, mode, start, target_distance_m, end=None,
                        n_directions=12, tol_pct=None, max_overlap=None, pool=8,
                        weights=None, requirements=None) -> list[CandidateRoute]:
    """반환: 최대 pool 개의 후보 (conditionScore 매기기 전 상태).
    tol_pct/max_overlap=None 이면 config 값. pipeline 이 여기에 점수를 붙이고 상위 3개를 고른다."""
    if tol_pct is None:
        tol_pct = config.CAND_DIST_TOL_PCT
    if max_overlap is None:
        max_overlap = config.CAND_MAX_OVERLAP
    results = []
    for k in range(n_directions):
        bearing = 360.0 * k / n_directions
        try:
            r = generate_course(G, idx, mode, start, target_distance_m,
                                end=end, bearing=bearing,
                                weights=weights, requirements=requirements)
        except (ValueError, nx.NetworkXException):
            continue                              # 이 방향만 건너뜀

        ok = r["distance_error_pct"] <= tol_pct and (
            mode == "out_and_back" or r["overlap_ratio"] <= max_overlap
        )
        if ok:
            results.append(r)

    results.sort(key=lambda r: (r["overlap_ratio"], r["distance_error_pct"]))
    # print("len befor drop:", len(results))
    return _drop_near_duplicate_courses(results)#[:pool]


if __name__ == "__main__":
    from src.algo.utils.graph import grid_graph, NodeIndex

    G = grid_graph(60, 60, 100)
    idx = NodeIndex(G)
    start = (G.nodes[(30, 30)]["y"], G.nodes[(30, 30)]["x"])

    top = generate_candidates(G, idx, "loop", start, 3000)
    print(f"loop 후보 풀 {len(top)}개:")
    for i, r in enumerate(top, 1):
        print(f"  {i}. {r['actual_distance_m']}m  err {r['distance_error_pct']}%  "
              f"overlap {r['overlap_ratio']}  scale {r['scale_m']}")
