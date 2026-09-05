"""
서울 전역 OSM 레이어 수집 스크립트
-----------------------------------
한 번 받아서 로컬에 저장(freeze)하고, data/배포 의 다른 CSV 레이어와 동일하게 사용한다.

수집 대상 (사용자 요청):
  1) 도보     : 보행 네트워크 그래프            -> 서울_보행네트워크.graphml
  2) 계단     : highway=steps (유무/위치)       -> 서울_계단.geojson / 서울_계단.csv
  3) 교차로   : 그래프 노드 중 street_count>=3  -> 서울_교차로.csv
  4) 횡단보도 : highway=crossing (OSM 보완본)   -> 서울_횡단보도_osm.csv
  5) 공원     : leisure=park 등 폴리곤          -> 서울_공원_osm.geojson / _centroid.csv
  6) 하천     : natural=water / waterway=*      -> 서울_하천_osm.geojson

출력 좌표계: EPSG:4326 (위경도).
거리 계산이 필요한 곳은 다운스트림에서 EPSG:5179 로 투영해 사용한다 (algorithm/code/step9 와 동일).

실행:
  python data/osm/build_osm_layers.py
결과:
  data/osm/out/ 에 저장. 검수 후 data/배포 로 승격.

의존성 (권장: 깨끗한 venv):
  python -m venv .venv && source .venv/bin/activate
  pip install "osmnx>=2.0" geopandas shapely pyproj pyarrow
  # anaconda 기본 환경은 numpy 1.x/2.x 바이너리 충돌이 있어 새 venv 를 권장한다.
"""

from __future__ import annotations
import os
import sys
import json
import time

import pandas as pd
import geopandas as gpd
from shapely.geometry import LineString

import osmnx as ox

# ----------------------------------------------------------------------------
# 설정
# ----------------------------------------------------------------------------
PLACE = "Seoul, South Korea"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(REPO, "cache")           # 기존 cache 폴더 재사용
os.makedirs(OUT, exist_ok=True)

ox.settings.use_cache = True
ox.settings.cache_folder = CACHE
ox.settings.log_console = True
ox.settings.requests_timeout = 300

SEOUL_GU = [
    "종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구", "성북구",
    "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구", "양천구", "강서구",
    "구로구", "금천구", "영등포구", "동작구", "관악구", "서초구", "강남구", "송파구", "강동구",
]


def _stamp(msg: str) -> None:
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def write_geojson(gdf: gpd.GeoDataFrame, path: str) -> None:
    """OSM 태그 컬럼은 리스트 값이 섞여 있어 GeoJSON 드라이버가 실패한다.
    지오메트리는 그대로 두고 나머지 object 컬럼만 문자열로 정규화해 저장."""
    g = gdf.copy()
    for col in g.columns:
        if col == g.geometry.name:
            continue
        if g[col].dtype == object:
            g[col] = g[col].apply(
                lambda v: "; ".join(map(str, v)) if isinstance(v, (list, tuple, set)) else v
            )
    g.to_file(path, driver="GeoJSON")


def load_gu_boundaries() -> gpd.GeoDataFrame | None:
    """자치구 경계 폴리곤. point-in-polygon 으로 자치구 컬럼을 채우는 데 사용."""
    rows = []
    for gu in SEOUL_GU:
        try:
            g = ox.geocode_to_gdf(f"{gu}, Seoul, South Korea")
            g["자치구"] = gu
            rows.append(g[["자치구", "geometry"]])
        except Exception as e:  # noqa: BLE001
            _stamp(f"  ! {gu} 경계 지오코딩 실패: {e}")
    if not rows:
        return None
    return gpd.GeoDataFrame(pd.concat(rows, ignore_index=True), crs="EPSG:4326")


def tag_gu(gdf: gpd.GeoDataFrame, gu: gpd.GeoDataFrame | None) -> gpd.GeoDataFrame:
    if gu is None:
        gdf["자치구"] = None
        return gdf
    joined = gpd.sjoin(gdf.to_crs(4326), gu, how="left", predicate="within")
    joined = joined.drop(columns=[c for c in ("index_right",) if c in joined.columns])
    return joined


# ----------------------------------------------------------------------------
# 1) 도보 네트워크
# ----------------------------------------------------------------------------
def build_walk_network():
    _stamp("1/6 보행 네트워크 그래프 다운로드 (수 분 소요)")
    G = ox.graph_from_place(PLACE, network_type="walk", simplify=True)
    ox.save_graphml(G, os.path.join(OUT, "서울_보행네트워크.graphml"))
    _stamp(f"    node={G.number_of_nodes():,}  edge={G.number_of_edges():,}")

    nodes, edges = ox.graph_to_gdfs(G, nodes=True, edges=True)
    # 검수/디버깅용 GeoPackage (선택)
    edges.reset_index()[["u", "v", "key", "highway", "name", "length", "geometry"]] \
        .to_file(os.path.join(OUT, "서울_보행네트워크_edges.gpkg"), driver="GPKG")
    return G, nodes, edges


# ----------------------------------------------------------------------------
# 2) 계단
# ----------------------------------------------------------------------------
def build_stairs(edges: gpd.GeoDataFrame, gu):
    _stamp("2/6 계단(highway=steps) 추출")

    def has_steps(v):
        if isinstance(v, list):
            return "steps" in v
        return v == "steps"

    steps = edges[edges["highway"].apply(has_steps)].copy()
    steps = steps.reset_index()[["u", "v", "name", "length", "geometry"]]
    write_geojson(gpd.GeoDataFrame(steps, geometry="geometry", crs="EPSG:4326"), os.path.join(OUT, "서울_계단.geojson"))

    # 중점 좌표를 CSV(통합 스키마)로도 저장 -> "유무" 판정/스코어링용
    pts = steps.copy()
    pts["geometry"] = pts.geometry.apply(
        lambda ls: ls.interpolate(0.5, normalized=True) if isinstance(ls, LineString) else ls.centroid
    )
    pts = tag_gu(gpd.GeoDataFrame(pts, geometry="geometry", crs="EPSG:4326"), gu)
    out = pd.DataFrame({
        "유형": "계단",
        "명칭": pts["name"].fillna(""),
        "위도": pts.geometry.y,
        "경도": pts.geometry.x,
        "자치구": pts.get("자치구"),
        "비고": "OSM highway=steps",
    })
    out.to_csv(os.path.join(OUT, "서울_계단.csv"), index=False, encoding="utf-8-sig")
    _stamp(f"    계단 구간 {len(out):,}건")
    return out


# ----------------------------------------------------------------------------
# 3) 교차로
# ----------------------------------------------------------------------------
def build_intersections(nodes: gpd.GeoDataFrame, gu):
    _stamp("3/6 교차로(street_count>=3) 추출")
    inter = nodes[nodes["street_count"].fillna(0) >= 3].copy()
    inter = inter.reset_index()  # osmid 컬럼화
    inter = tag_gu(gpd.GeoDataFrame(inter, geometry="geometry", crs="EPSG:4326"), gu)
    out = pd.DataFrame({
        "유형": "교차로",
        "명칭": "",
        "위도": inter.geometry.y,
        "경도": inter.geometry.x,
        "자치구": inter.get("자치구"),
        "비고": "OSM node street_count=" + inter["street_count"].astype("Int64").astype(str),
    })
    out.to_csv(os.path.join(OUT, "서울_교차로.csv"), index=False, encoding="utf-8-sig")
    _stamp(f"    교차로 {len(out):,}건")
    return out


# ----------------------------------------------------------------------------
# 4) 횡단보도 (OSM 보완본)
# ----------------------------------------------------------------------------
def build_crossings(gu):
    _stamp("4/6 횡단보도(highway=crossing) 다운로드")
    f = ox.features_from_place(PLACE, tags={"highway": "crossing"})
    f = f[f.geometry.type == "Point"].copy().to_crs(4326)
    f = tag_gu(f, gu)
    out = pd.DataFrame({
        "유형": "횡단보도",
        "명칭": f.get("name", pd.Series(index=f.index)).fillna(""),
        "위도": f.geometry.y,
        "경도": f.geometry.x,
        "자치구": f.get("자치구"),
        "비고": (
            "OSM; markings=" + f.get("crossing:markings", pd.Series(index=f.index)).fillna("?").astype(str)
            + "; tactile=" + f.get("tactile_paving", pd.Series(index=f.index)).fillna("?").astype(str)
        ),
    })
    out.to_csv(os.path.join(OUT, "서울_횡단보도_osm.csv"), index=False, encoding="utf-8-sig")
    _stamp(f"    횡단보도(OSM) {len(out):,}건  ※ 기존 서울_횡단보도_정제.csv(39,036) 와 병합/중복제거 검토")
    return out


# ----------------------------------------------------------------------------
# 5) 공원
# ----------------------------------------------------------------------------
def build_parks(gu):
    _stamp("5/6 공원 폴리곤 다운로드")
    tags = {
        "leisure": ["park", "garden", "recreation_ground", "pitch", "playground"],
        "landuse": ["recreation_ground", "grass", "village_green"],
    }
    f = ox.features_from_place(PLACE, tags=tags).to_crs(4326)
    f = f[f.geometry.type.isin(["Polygon", "MultiPolygon"])].copy()
    keep = [c for c in ("name", "leisure", "landuse", "geometry") if c in f.columns]
    f = f[keep]
    write_geojson(f, os.path.join(OUT, "서울_공원_osm.geojson"))

    cent = f.copy()
    cent["geometry"] = cent.geometry.representative_point()
    cent = tag_gu(gpd.GeoDataFrame(cent, geometry="geometry", crs="EPSG:4326"), gu)
    out = pd.DataFrame({
        "유형": "공원",
        "명칭": cent.get("name", pd.Series(index=cent.index)).fillna(""),
        "위도": cent.geometry.y,
        "경도": cent.geometry.x,
        "자치구": cent.get("자치구"),
        "비고": "OSM " + cent.get("leisure", pd.Series(index=cent.index)).fillna(
            cent.get("landuse", pd.Series(index=cent.index))).astype(str),
    })
    out.to_csv(os.path.join(OUT, "서울_공원_osm_centroid.csv"), index=False, encoding="utf-8-sig")
    _stamp(f"    공원 폴리곤 {len(f):,}건  ※ 기존 도시공원 CSV(1,786, 점) 와 상호보완")
    return out


# ----------------------------------------------------------------------------
# 6) 하천
# ----------------------------------------------------------------------------
def build_water():
    _stamp("6/6 하천/수역 다운로드")
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
        write_geojson(poly, os.path.join(OUT, "서울_하천_osm_polygon.geojson"))
    if len(line):
        write_geojson(line, os.path.join(OUT, "서울_하천_osm_line.geojson"))
    _stamp(f"    수역 폴리곤 {len(poly):,} / 물길 라인 {len(line):,}")
    return poly, line


# ----------------------------------------------------------------------------
def main():
    _stamp(f"place={PLACE}  out={OUT}  cache={CACHE}")
    gu = load_gu_boundaries()
    _stamp(f"자치구 경계 {0 if gu is None else len(gu)}개 확보")

    _G, nodes, edges = build_walk_network()

    combined = []
    combined.append(build_stairs(edges, gu))
    combined.append(build_intersections(nodes, gu))
    combined.append(build_crossings(gu))
    combined.append(build_parks(gu))
    build_water()

    merged = pd.concat(combined, ignore_index=True)
    merged.to_csv(os.path.join(OUT, "서울_OSM시설_통합_추가분.csv"),
                  index=False, encoding="utf-8-sig")
    _stamp(f"통합 추가분 CSV {len(merged):,}건 저장 완료")

    meta = {
        "place": PLACE,
        "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "osmnx": ox.__version__,
        "crs": "EPSG:4326",
        "counts": merged["유형"].value_counts().to_dict(),
        "files": sorted(os.listdir(OUT)),
    }
    with open(os.path.join(OUT, "_meta.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    _stamp("완료. data/osm/out/_meta.json 확인 후 data/배포 로 승격.")


if __name__ == "__main__":
    sys.exit(main())
