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
    # 여기에서 raw 데이터의 겨웅에는
    # u와 v를 잇는 가장 짧은 edge 중에서 highway: {} 을 꺼낸 값임.

    # 만약에 highway가 존재하지 않는다면 그냥 아무것도 없는 집합을 반환해주기
    if raw is None:
        return set()
    # raw가 set로 변형 가능한 형태이라면 그대로 변환해서 반환해주기
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
    # 경로 전체 길이 / 보행 친화 도로 / 큰 도로로 판단되는 거리
    total = walk = big = 0.0
    # highway=steps 구간 개수
    stairs = 0
    # highway 태그 존재 여부
    hw_seen = False

    for u, v in zip(nodes[:-1], nodes[1:]):
        # MultiDiGraph 객체에서 u, v 노드를 잇는 edge를 찾고, 그게 존재하지 않으면 그대로 None 반환
        # 존재하면 그 값에서 length를 반환. 최대 거리는 10^18 까지 제한해두었음.
        # 반환 값은 존재하는 모든 edge들 중에서 내부 속성으로 length를 가장 짧게 가지고 있는 객체.
        e = _pick_edge(G, u, v)
        if not e:
            continue
        # 꺼낸 거리가 음수이면 막아주고, 양수이면 받아서 float로 변경해주기.
        # 실제로 load_graphml을 할 때 float로 저장해서 바꿔주지만
        # 방어적인 성격의 코드인 것으로 보임.
        L = float(e.get("length", 0.0))
        # e에서 꺼낸 length값을 누적시켜주기
        total += L
        # e 에서 highway 속성 있으면 가져와주기
        raw = e.get("highway")
        if raw is None:
            continue

        # highway 발견했으니 플래그 켜주기
        hw_seen = True
        tags = _hw_tags(raw)

        #
        if "steps" in tags:
            stairs += 1

        # 걸을 수 있는 value 종류라면 추가해주기
        if tags & _WALKABLE:
            walk += L
        # 큰 길목 느낌이라면 추가해주기
        if tags & _BIGROAD:
            big += L

    # 전체 경로 길이
    km = (total / 1000) or 1e-9
    # 신호등 / 횡단보도 수
    signals = crossings = 0
    for n in nodes:
        # highway 속성을 MultiDiGraph 에서 가져오기
        hw = str(G.nodes[n].get("highway") or "")
        # 경우에 따라 카운터 증가시켜주기
        if "traffic_signals" in hw:
            signals += 1
        elif "crossing" in hw:
            crossings += 1

    # hw를 찾지 못했다면 꺼주기
    if not hw_seen:                       # 격자 등 속성 없는 그래프
        return {"length_m": round(total), "walkable_ratio": None,
                "bigroad_ratio": None, "stairs_count": 0,
                "signal_per_km": None, "crossing_per_km": None}
    
    return {
        # 총 거리
        "length_m": round(total),
        # 걸을 수 있는 비율
        "walkable_ratio": round(walk / total, 3) if total else None,
        # 큰 길 비율
        "bigroad_ratio": round(big / total, 3) if total else None,
        # 계단이 포함된 경로 개수
        "stairs_count": stairs,
        # km당 신호등 수
        "signal_per_km": round(signals / km, 2),
        # km별 횡단보도 수
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
