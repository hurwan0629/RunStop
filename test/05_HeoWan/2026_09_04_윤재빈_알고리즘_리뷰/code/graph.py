"""
도로 그래프 로드 + 좌표 -> 노드 스냅.

TMAP(블랙박스) 대신 OSM 보행 네트워크를 networkx 그래프로 직접 들고 다닌다.
그래야 routing.py 에서 "이미 지나온 엣지에 벌점" 조작이 가능하다.

그래프 스키마 (osmnx 와 동일):
  노드: x=경도, y=위도   |   엣지: length=미터   |   타입: MultiDiGraph

실제 서울 그래프는 build_graph.py 로 만든 graphml 을 load_graphml() 로 읽는다.
그게 없을 때 개발/테스트용으로 grid_graph() 를 쓴다.
"""

import pickle
from pathlib import Path

import networkx as nx
import numpy as np
from scipy.spatial import cKDTree

from geo import point_at_bearing, to_5179


def load_graphml(path):
    """osmnx graphml -> MultiDiGraph. 문자열로 저장된 좌표/길이를 float 로 복원."""
    G = nx.read_graphml(path, force_multigraph=True)
    for _, d in G.nodes(data=True):
        d["x"] = float(d["x"])
        d["y"] = float(d["y"])
    for _, _, d in G.edges(data=True):
        d["length"] = float(d.get("length", 1.0))
    return G


def load_graph(graphml_path):
    """graphml 로드 + pickle 캐시. 두 번째 실행부터 훨씬 빠름 (~19s -> ~3s).
    .pkl 이 graphml 보다 최신일 때만 사용 (build_graph 재실행 시 자동 무효화).
    networkx 버전을 올린 뒤 이상하면 .pkl 을 지우면 다음 실행에 새로 만든다."""
    p = Path(graphml_path)
    # graph 파일의 suffix를 .pkl로 변환하여 캐싱해주게 됨.
    cache = p.with_suffix(".pkl")
    # 캐싱이 존재하고 최신상태라면 사용해주기
    if cache.exists() and cache.stat().st_mtime >= p.stat().st_mtime:
        # 캐시 파일을 읽어서 반환해주기
        with open(cache, "rb") as f:
            return pickle.load(f)
    # graphml 파일을 읽어서 반환해주기
    # networkX를 이용하여 GraphML을 읽은 다음에 해당 객체 그래프를 .pkl 파일로 저장해주기
    G = load_graphml(str(p))
    with open(cache, "wb") as f:
        # G라는 파이썬 객체를 직렬화해서 .pkl로 저장.
        pickle.dump(G, f, protocol=pickle.HIGHEST_PROTOCOL)
    return G
 

class NodeIndex:
    """(lat, lon) -> 가장 가까운 그래프 노드 id. EPSG:5179 평면에서 KD-tree 최근접."""

    def __init__(self, G):
        # G객체 (WG84)에 존재하는 노드들을 list 형태로 만들어서 받아주기
        self.ids = list(G.nodes)
        # G에 존재하는 ids(노드들)에 대해서 모두 순회를 하며 
        xy = np.array([
            # pyproj.Transformer 객체를 이용해서 좌표 참조를 하는 형태.
            # 이곳에서 x좌표와 y좌표를 뽑아와주게 됨.
            to_5179.transform(G.nodes[n]["x"], G.nodes[n]["y"])
            for n in self.ids
        ])
        # SciPy에서 가장 가까운 점을 빠르게 찾기 위한 객체인 cKDTree를 이용해서 노드 인덱스를 걸어주기
        self._tree = cKDTree(xy)

    # 
    def snap(self, lat, lon):
        """lat, lon을 넣어서 WG84 형태로 변환한 다음에 가까운 인덱스를 활용하는 방식"""
        x, y = to_5179.transform(lon, lat)
        _, i = self._tree.query([x, y])
        return self.ids[i]


def grid_graph(rows=80, cols=80, spacing_m=100.0, origin=(37.50, 127.02)):
    """테스트용 격자 도로망. 실제 OSM 그래프와 같은 스키마(x, y, length).
    r 증가 = 북쪽, c 증가 = 동쪽. 모든 엣지 양방향."""
    G = nx.MultiDiGraph()
    lat0, lon0 = origin

    for r in range(rows):
        # lat0/lon0 에서 시작해서 0(북쪽)으로 r * smacing_m으로 이동하는 것을 나타냄.
        lat_r, lon_r = point_at_bearing(lat0, lon0, 0, r * spacing_m)
        for c in range(cols):
            lat, lon = point_at_bearing(lat_r, lon_r, 90, c * spacing_m)
            # Geod 객체에 노드를 추가해주기
            G.add_node((r, c), x=lon, y=lat)

    # 위에서 만든 rows * cols 만큼의 그래프에 선을 이어주는 방식
    for r in range(rows):   
        for c in range(cols):
            # delta r, c 방향으로 1씩 이동해가면서 양방향으로 가는 edge를 각각 만들어주기.
            # (r, c)-(r+1, c) 또는 (r, c)-(r, c+1) 형태로 이어진 그래프 방식
            for dr, dc in ((1, 0), (0, 1)):
                r2, c2 = r + dr, c + dc
                if r2 < rows and c2 < cols:
                    G.add_edge((r, c), (r2, c2), length=spacing_m)
                    G.add_edge((r2, c2), (r, c), length=spacing_m)
    return G


if __name__ == "__main__":
    G = grid_graph(rows=10, cols=10, spacing_m=100)
    print("노드:", G.number_of_nodes(), "엣지:", G.number_of_edges())
    print("(9,9) 좌표:", G.nodes[(9, 9)])
    print("연결됨?", nx.is_strongly_connected(G))

    idx = NodeIndex(G)
    t = G.nodes[(5, 5)]
    print("스냅:", idx.snap(t["y"], t["x"]), "(→ (5,5) 기대)")
