"""
서울 녹지·하천 폴리곤만 받아 geojson 으로 저장 (weighting 의 인접률 계산용).

build_osm_layers.py 의 build_parks / build_water 로직을 축약한 것.
walk 그래프 재다운로드·자치구 지오코딩 없음 → 빠름.

실행 (venv):
    cd /Users/user/Desktop/runstop
    /Users/user/Desktop/runstop/.venv/bin/python data/osm/fetch_park_water.py

결과:
    data/osm/out/서울_공원.geojson
    data/osm/out/서울_하천_polygon.geojson
    data/osm/out/서울_하천_line.geojson
"""

from __future__ import annotations

import os
import time

import geopandas as gpd
import osmnx as ox

PLACE = "Seoul, South Korea"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(REPO, "cache")           # 기존 Overpass 캐시 재사용
os.makedirs(OUT, exist_ok=True)

ox.settings.use_cache = True
ox.settings.cache_folder = CACHE
ox.settings.log_console = True
ox.settings.requests_timeout = 300


def _stamp(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def write_geojson(gdf: gpd.GeoDataFrame, path: str) -> None:
    """OSM 태그 컬럼은 리스트 값이 섞여 GeoJSON 드라이버가 실패한다.
    지오메트리는 그대로 두고 나머지 object 컬럼만 문자열로 정규화."""
    g = gdf.copy()
    for col in g.columns:
        if col == g.geometry.name:
            continue
        if g[col].dtype == object:
            g[col] = g[col].apply(
                lambda v: "; ".join(map(str, v)) if isinstance(v, (list, tuple, set)) else v
            )
    g.to_file(path, driver="GeoJSON")


def fetch_parks() -> None:
    _stamp("공원/녹지 폴리곤 다운로드")
    tags = {
        "leisure": ["park", "garden", "recreation_ground", "pitch", "playground"],
        "landuse": ["recreation_ground", "grass", "village_green"],
    }
    f = ox.features_from_place(PLACE, tags=tags).to_crs(4326)
    f = f[f.geometry.type.isin(["Polygon", "MultiPolygon"])].copy()
    keep = [c for c in ("name", "leisure", "landuse", "geometry") if c in f.columns]
    f = f[keep]
    out_path = os.path.join(OUT, "서울_공원.geojson")
    write_geojson(f, out_path)
    _stamp(f"    공원/녹지 폴리곤 {len(f):,}건 -> {out_path}")


def fetch_water() -> None:
    _stamp("하천/수역 다운로드")
    tags = {
        "natural": ["water"],
        "water": True,
        "waterway": ["river", "stream", "canal", "riverbank"],
    }
    f = ox.features_from_place(PLACE, tags=tags).to_crs(4326)
    keep = [c for c in ("name", "natural", "water", "waterway", "geometry") if c in f.columns]
    f = f[keep]

    poly = f[f.geometry.type.isin(["Polygon", "MultiPolygon"])]
    line = f[f.geometry.type.isin(["LineString", "MultiLineString"])]
    if len(poly):
        write_geojson(poly, os.path.join(OUT, "서울_하천_polygon.geojson"))
    if len(line):
        write_geojson(line, os.path.join(OUT, "서울_하천_line.geojson"))
    _stamp(f"    수역 폴리곤 {len(poly):,} / 물길 라인 {len(line):,}")


if __name__ == "__main__":
    t0 = time.time()
    _stamp(f"place={PLACE}  out={OUT}  cache={CACHE}")
    fetch_parks()
    fetch_water()
    _stamp(f"완료 ({time.time() - t0:.0f}s)")
