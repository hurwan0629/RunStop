"""
서울 보행 네트워크 그래프 빌더 (osmnx 전용, 1회성)
====================================================
OpenStreetMap 보행 도로망을 내려받아 graphml 파일로 저장한다.
이 파일만 osmnx 를 쓴다. 나머지 모듈(graph/routing/course/...)은 networkx 만 쓰고,
여기서 만든 graphml 을 graph.load_graphml() 로 읽는다.

osmnx 는 numpy 1.x/2.x 충돌 때문에 anaconda base 가 아니라 깨끗한 venv 에서:
    python -m venv .venv && source .venv/bin/activate
    pip install "osmnx>=2.0" networkx scipy pyproj pandas shapely
    python build_graph.py --near 37.4979 127.0276 --dist 4000   # 개발용 (강남 반경 4km)
    python build_graph.py                                        # 서울 전역 (수 분, 수백 MB)

빌드 후 pipeline.py 에서:
    # G = grid_graph(...)
    from graph import load_graphml
    G = load_graphml("data/서울_보행네트워크.graphml")
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT_DEFAULT = HERE / "data" / "서울_보행네트워크.graphml"
# 기존 runstop 프로젝트가 받아둔 Overpass 캐시 재사용 (중복 다운로드 방지). 없으면 무시됨.
CACHE_DIR = Path("/Users/user/Desktop/runstop/cache")


def _import_osmnx():
    try:
        import osmnx as ox
    except ImportError:
        sys.exit(
            "osmnx 가 없습니다. 깨끗한 venv 에서:\n"
            "  python -m venv .venv && source .venv/bin/activate\n"
            '  pip install "osmnx>=2.0" networkx scipy pyproj pandas shapely\n'
            "  python build_graph.py ..."
        )
    return ox


def build(place, near, dist_m, out_path, largest_scc):
    ox = _import_osmnx()

    ox.settings.use_cache = True
    if CACHE_DIR.exists():
        ox.settings.cache_folder = str(CACHE_DIR)
    ox.settings.log_console = True
    ox.settings.requests_timeout = 300

    t0 = time.time()
    if near is not None:
        lat, lon = near
        print(f"[다운로드] 중심 ({lat}, {lon}) 반경 {dist_m}m, network_type=walk")
        G = ox.graph_from_point((lat, lon), dist=dist_m, network_type="walk", simplify=True)
    else:
        query = place or "Seoul, South Korea"
        print(f"[다운로드] '{query}' 전역, network_type=walk (수 분 소요 가능)")
        G = ox.graph_from_place(query, network_type="walk", simplify=True)

    print(f"    node={G.number_of_nodes():,}  edge={G.number_of_edges():,}  "
          f"({time.time() - t0:.0f}s)")

    if largest_scc:
        # 라우팅은 그래프가 강연결이라고 가정한다. 끊긴 조각(섬)은 버린다.
        before = G.number_of_nodes()
        G = ox.truncate.largest_component(G, strongly=True)
        print(f"[정리] 최대 강연결 덩어리만 유지: {before:,} -> {G.number_of_nodes():,} 노드")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(G, str(out_path))
    print(f"[저장] {out_path}  ({out_path.stat().st_size / 1e6:.1f} MB)")

    # 우리 로더로 되읽어 스키마 확인
    sys.path.insert(0, str(HERE))
    from graph import load_graph, NodeIndex  # noqa: E402

    G2 = load_graph(str(out_path))          # pkl 캐시도 여기서 미리 만들어둠
    n0 = next(iter(G2.nodes))
    print(f"[검증] load_graph OK  node={G2.number_of_nodes():,}  "
          f"예시노드 {n0!r} -> x={G2.nodes[n0]['x']:.5f}, y={G2.nodes[n0]['y']:.5f}")
    idx = NodeIndex(G2)
    print(f"[검증] NodeIndex.snap(37.4979, 127.0276) -> {idx.snap(37.4979, 127.0276)!r}")


def main():
    p = argparse.ArgumentParser(description="서울 보행 네트워크 graphml 빌더")
    p.add_argument("--place", help='지역명 (예: "강남구, 서울"). 생략 시 서울 전역')
    p.add_argument("--near", nargs=2, type=float, metavar=("LAT", "LON"),
                   help="이 좌표 중심 반경만 (개발용). --place 보다 우선")
    p.add_argument("--dist", type=int, default=4000, help="--near 반경(m), 기본 4000")
    p.add_argument("--out", type=Path, default=OUT_DEFAULT, help=f"출력 경로, 기본 {OUT_DEFAULT}")
    p.add_argument("--all-components", action="store_true",
                   help="끊긴 조각도 유지 (기본은 최대 강연결 덩어리만)")
    a = p.parse_args()

    build(
        place=a.place,
        near=tuple(a.near) if a.near else None,
        dist_m=a.dist,
        out_path=a.out,
        largest_scc=not a.all_components,
    )


if __name__ == "__main__":
    main()
