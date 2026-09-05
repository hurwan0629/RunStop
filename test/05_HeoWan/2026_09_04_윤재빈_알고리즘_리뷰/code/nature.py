"""
녹지·하천 인접률 — course 의 coords(위경도 폴리라인)만 소비.

data/osm/out/ 의 폴리곤 geojson 을 EPSG:5179 로 투영해 GeoDataFrame + 공간인덱스로 캐시.
인접률 = 코스 주변 buffer_m 띠의 면적 중 (공원 / 하천) 폴리곤과 겹치는 비율.

geojson 이 없으면 해당 값은 None (fetch_park_water.py 로 생성).
"""

from pathlib import Path

import geopandas as gpd
from shapely import LineString

from geo import to_5179

OUT = Path(__file__).resolve().parent.parent.parent / "data" / "osm" / "out"
SOURCES = {
    "park": OUT / "서울_공원.geojson",
    "water": OUT / "서울_하천_polygon.geojson",
}

_CACHE = {}


def _load():
    if _CACHE:
        return _CACHE
    for key, path in SOURCES.items():
        if path.exists():
            g = gpd.read_file(path).to_crs(5179)
            g.sindex  # 공간인덱스 미리 구축
            _CACHE[key] = g
        else:
            _CACHE[key] = None
    return _CACHE


def _project_line(coords):
    return LineString([to_5179.transform(lon, lat) for lat, lon in coords])


def adjacency_ratios(coords, buffer_m=100):
    line = _project_line(coords)
    band = line.buffer(buffer_m)
    band_area = band.area or 1e-9
    cache = _load()

    out = {}
    for key in SOURCES:
        gdf = cache.get(key)
        if gdf is None:
            out[f"{key}_ratio"] = None
            continue
        hits = list(gdf.sindex.query(band, predicate="intersects"))
        if not hits:
            out[f"{key}_ratio"] = 0.0
            continue
        poly = gdf.geometry.iloc[hits].union_all()
        out[f"{key}_ratio"] = round(band.intersection(poly).area / band_area, 3)
    return out


if __name__ == "__main__":
    from graph import load_graph, NodeIndex
    from course import generate_course

    G = load_graph("data/서울_보행네트워크.graphml")
    idx = NodeIndex(G)
    # 한강 가까운 출발점
    r = generate_course(G, idx, "loop", (37.5133, 127.0590), 4000)
    from pprint import pprint
    pprint(adjacency_ratios(r["coords"]))
