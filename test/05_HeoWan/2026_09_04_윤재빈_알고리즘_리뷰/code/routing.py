"""
"최단경로 버튼" 하나 + 이미 지나온 엣지에 벌점.

course.py 가 모드마다 이 함수를 2~3번 호출해 경로를 조립한다.
TMAP(블랙박스)로는 불가능했던 것: penalty_edges 를 넘기면 그 도로의 가중치를
factor 배로 쳐서, 복귀 경로가 자연히 다른 길로 가도록 유도한다.
"""

import networkx as nx


def _edge_len(data):
    """엣지 길이(m). MultiDiGraph면 data={key: 속성}, 단순 그래프면 속성 dict 자체."""
    if data is None:
        return float("inf")
    if "length" in data:
        return float(data["length"])
    return min(float(a.get("length", 1.0)) for a in data.values())


def edge_set(nodes):
    """
    list[int](nodeIdx)를 인자로 받아서 set[frozenset((idx_1, idx2))]를 반환해줌.

    경로 노드열 -> 방향 무시한 엣지 집합 {frozenset({u, v}), ...}.
    """
    return {frozenset((u, v)) for u, v in zip(nodes[:-1], nodes[1:])}


def shortest_path(G, src, dst, penalty_edges=None, factor=5.0):
    """src, dst = 노드 id. penalty_edges = {frozenset({u,v}), ...} (이미 쓴 도로).
    반환: (노드 리스트, 실제 거리_m). 경로 없으면 nx.NetworkXNoPath 발생.
    
  반환값의 배열은 list[int] 형태라고 이해하면 됩니다.
    """
    # 이미 사용된 값 또는 set으로 만들기
    used = penalty_edges or set()

    # 양 노드와 그 두 노드를 잇는 edge에 대해서 벌점을 주는 함수
    def weight(u, v, data):
        # data에서 점수 뽑아서 주기
        base = _edge_len(data)
        # 이미 사용된 edge라면 factor만큼 배율하여 비용을 주고, 사용되지 않았다면 기본 거리만큼 cost를 주기.
        return base * factor if frozenset((u, v)) in used else base

    # nx에 Geom 객체 안에서 src와 dst 사이의 최단거리를 구해서 주기. 
    # 여기에서 반환값은 list[node_id] 를 말함.
    nodes = nx.shortest_path(G, src, dst, weight=weight)
    length = sum(
        _edge_len(G.get_edge_data(a, b))
        for a, b in zip(nodes[:-1], nodes[1:])
    )
    return nodes, length


if __name__ == "__main__":
    from graph import grid_graph

    G = grid_graph(10, 10, 100)
    nodes, dist = shortest_path(G, (0, 0), (0, 4))
    print("벌점 없음:", nodes, "->", dist, "m")

    used = edge_set(nodes)
    nodes2, dist2 = shortest_path(G, (0, 0), (0, 4), penalty_edges=used, factor=5.0)
    print("벌점 있음:", nodes2, "->", dist2, "m  (우회로 더 길어야 정상)")
    print("겹친 도로:", len(used & edge_set(nodes2)), "/", len(used))
