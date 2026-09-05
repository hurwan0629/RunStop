"""
노면·흐름 프로파일 — 코스가 어떤 길로 이뤄졌는지.
course 가 넘겨준 노드 경로(nodes)와 그래프 G 의 OSM 엣지/노드 속성을 읽는다.

- walkable_ratio : footway/path/pedestrian/living_street 등 보행자 친화 길이 비율
- bigroad_ratio  : primary/secondary/tertiary/trunk 등 큰길 길이 비율 (낮을수록 좋음)
- stairs_count   : highway=steps 세그먼트 수
- signal_per_km  : 경로가 지나는 traffic_signals 노드 / km
- crossing_per_km: 횡단보도 노드 / km

격자 그래프(속성 없음)면 전부 None / 0 을 돌려준다.
"""

import ast

_WALKABLE = {"footway", "path", "pedestrian", "living_street", "track",
             "steps", "corridor", "cycleway",
             "residential", "unclassified", "service"}   # 주택가 이면도로 = 러닝 무난
_BIGROAD = {"primary", "secondary", "tertiary", "trunk", "motorway",
            "primary_link", "secondary_link", "tertiary_link",
            "trunk_link", "motorway_link", "busway"}


def _hw_tags(raw):
    """highway 원형(문자열 'steps' 또는 "['steps','footway']") -> 태그 집합."""
    if raw is None:
        return set()
    if isinstance(raw, (list, set, tuple)):
        return set(raw)
    s = str(raw)
    if s.startswith("["):
        try:
            return set(ast.literal_eval(s))
        except (ValueError, SyntaxError):
            return {s}
    return {s}


def _pick_edge(G, u, v):
    """u->v 평행 엣지 중 최단 길이 하나의 속성 dict."""
    d = G.get_edge_data(u, v) or G.get_edge_data(v, u)
    if not d:
        return None
    return min(d.values(), key=lambda a: float(a.get("length", 1e18)))


def profile(G, nodes):
    total = walk = big = 0.0
    stairs = 0
    hw_seen = False

    for u, v in zip(nodes[:-1], nodes[1:]):
        e = _pick_edge(G, u, v)
        if not e:
            continue
        L = float(e.get("length", 0.0))
        total += L
        raw = e.get("highway")
        if raw is None:
            continue
        hw_seen = True
        tags = _hw_tags(raw)
        if "steps" in tags:
            stairs += 1
        if tags & _WALKABLE:
            walk += L
        if tags & _BIGROAD:
            big += L

    km = (total / 1000) or 1e-9
    signals = crossings = 0
    for n in nodes:
        hw = str(G.nodes[n].get("highway") or "")
        if "traffic_signals" in hw:
            signals += 1
        elif "crossing" in hw:
            crossings += 1

    if not hw_seen:                       # 격자 등 속성 없는 그래프
        return {"length_m": round(total), "walkable_ratio": None,
                "bigroad_ratio": None, "stairs_count": 0,
                "signal_per_km": None, "crossing_per_km": None}

    return {
        "length_m": round(total),
        "walkable_ratio": round(walk / total, 3) if total else None,
        "bigroad_ratio": round(big / total, 3) if total else None,
        "stairs_count": stairs,
        "signal_per_km": round(signals / km, 2),
        "crossing_per_km": round(crossings / km, 2),
    }


if __name__ == "__main__":
    from graph import load_graph, NodeIndex
    from course import generate_course

    G = load_graph("data/서울_보행네트워크.graphml")
    idx = NodeIndex(G)
    r = generate_course(G, idx, "loop", (37.4979, 127.0276), 3000)
    from pprint import pprint
    pprint(profile(G, r["nodes"]))
