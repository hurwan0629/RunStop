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
from src.algo.routing.guidance import guided_anchors


def _guided_courses(G, idx, mode, start, target_m, end, vias, weights, requirements, anchors):
    # 자동 기준점은 사용자 경유지 수나 원래 route type을 바꾸지 않는다.
    candidates = []
    for anchor, bearing, source in anchors:
        try:
            candidate = generate_course_via(
                G, idx, mode, start, list(vias) + [anchor], target_m,
                end=end if mode == "point_to_point" else None,
                bearing=bearing, weights=weights, requirements=requirements,
            )
        except (ValueError, nx.NetworkXException):
            continue
        candidate["mode"] = mode
        candidate["user_via_count"] = len(vias)
        candidate["generation_source"] = f"guided:{source}"
        candidates.append(candidate)
    return candidates


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
    facility_preferences: dict[str, str] | None = None,
) -> list[CandidateRoute]:
    """사용자 경유지가 있을 때: 우회점 방향(bearing)만 바꿔가며 후보 풀 생성.
    상위 3개 컷은 안 함 — recommend 가 conditionScore 매긴 뒤 자른다."""
    tail = end if mode == "point_to_point" else None   # LOOP/ROUND_TRIP 는 시작점 복귀
    requirements = dict(requirements or {})
    anchors = guided_anchors(G, idx, mode, start, target_m, end, vias,
                             weights, requirements, facility_preferences, pool)
    out = []
    if mode == "point_to_point":
        n_directions = 6
    for k in range(n_directions):
        try:
            r = generate_course_via(G, idx, mode, start, vias, target_m, end=tail,
                                    bearing=360.0 * k / n_directions,
                                    weights=weights, requirements=requirements)
        except (ValueError, nx.NetworkXException):
            continue
        if r["distance_error_pct"] <= config.CAND_DIST_TOL_PCT:
            out.append(r)
    for candidate in out:
        candidate["mode"] = mode
        candidate["user_via_count"] = len(vias)
    guided = _guided_courses(G, idx, mode, start, target_m, end, vias,
                             weights, requirements, anchors)
    out = [c for c in guided + out if c["distance_error_pct"] <= config.CAND_DIST_TOL_PCT
           and (mode == "out_and_back" or c["overlap_ratio"] <= config.CAND_MAX_OVERLAP)]
    return _drop_near_duplicate_courses(out)

def generate_candidates(G, idx, mode, start, target_distance_m, end=None,
                        n_directions=12, tol_pct=None, max_overlap=None, pool=8,
                        weights=None, requirements=None, facility_preferences=None) -> list[CandidateRoute]:
    """방향 후보 + 최대 pool개의 선호 유도 시도. 중복 제거 후 기존 AI에 전달.
    pool은 전체 후보를 자르는 값이 아니다. tol_pct/max_overlap은 기존 품질 기준."""
    if tol_pct is None:
        tol_pct = config.CAND_DIST_TOL_PCT
    if max_overlap is None:
        max_overlap = config.CAND_MAX_OVERLAP
    results = []
    requirements = dict(requirements or {})
    anchors = guided_anchors(G, idx, mode, start, target_distance_m, end, [],
                             weights, requirements, facility_preferences, pool)
    if mode == "point_to_point":
        n_directions = 6
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
    guided = _guided_courses(G, idx, mode, start, target_distance_m, end, [],
                             weights, requirements, anchors)
    results = [c for c in guided + results if c["distance_error_pct"] <= tol_pct
               and (mode == "out_and_back" or c["overlap_ratio"] <= max_overlap)]
    # print("len befor drop:", len(results))
    return _drop_near_duplicate_courses(results)


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
