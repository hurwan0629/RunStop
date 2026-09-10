"""
녹지·하천 인접률 — course 의 coords(위경도 폴리라인)만 소비.

data/osm/out/ 의 폴리곤 geojson 을 EPSG:5179 로 투영해 GeoDataFrame + 공간인덱스로 캐시.
인접률 = 코스 주변 buffer_m 띠의 면적 중 (공원 / 하천) 폴리곤과 겹치는 비율.

geojson 이 없으면 해당 값은 None (fetch_park_water.py 로 생성).
"""

import geopandas as gpd
from shapely import LineString

from algo.utils.geo import to_5179, CRS_METRIC
from algo._datapaths import OSM_OUT as NATURE_DATA_DIRECTORY   # 배포 패키지 datasets/osm/out 또는 RUNSTOP_DATA_DIR
from algo import config
NATURE_LAYER_PATHS = {
    "park": NATURE_DATA_DIRECTORY / "서울_공원.geojson",
    "water": NATURE_DATA_DIRECTORY / "서울_하천_polygon.geojson",
}

_NATURE_LAYER_CACHE = {}


def _load_nature_layers():
    # 캐시 있으면 써주기
    if _NATURE_LAYER_CACHE:
        return _NATURE_LAYER_CACHE
    # 존재하는 geojson 2차원 데이터를 가져오기
    for nature_type, geojson_path in NATURE_LAYER_PATHS.items():
        # 해당 경로가 존재한다면 사용해주기
        if geojson_path.exists():
            # CRS 좌표계로 gdopandas 데이터프레임을 불러오기
            layer_gdf = gpd.read_file(geojson_path).to_crs(CRS_METRIC)
            # 공간인덱스 호출한번 해서 가져와주기
            layer_gdf.sindex  # 공간인덱스 미리 구축
            # 환경 데이터에 데이터 프레임 넣어놔주기
            _NATURE_LAYER_CACHE[nature_type] = layer_gdf
        else:
            # 파일이 실제로 없으면 None을 넣어주기
            _NATURE_LAYER_CACHE[nature_type] = None
    return _NATURE_LAYER_CACHE


def _create_projected_route_line(route_coordinates):
    return LineString([to_5179.transform(lon, lat) for lat, lon in route_coordinates])


def analyze_nature_adjacency(route_coordinates: list[tuple[float, float]], buffer_distance_m=config.BUFFER_M):
    """경로 지점들을 받아서 안에 존재하는 """

    # shapely의 LineString 생성 함수
    route_line = _create_projected_route_line(route_coordinates)
    # LineString에 버퍼 넣어주기
    route_buffer = route_line.buffer(buffer_distance_m)
    # 버퍼 범위 잡아주기
    buffer_area_m2 = route_buffer.area or 1e-9
    # key: df (NATURE_LAYER_PATHS에 대한 =데이터들) 받아와주기
    nature_layers = _load_nature_layers()

    # 
    metrics = {}
    # 환경 종류 가져오기 [2026-09-10 12:55:07] 기준 [park(공원), water(하천)]이 존재함.
    for nature_type in NATURE_LAYER_PATHS:
        # 해당 geopandas df 가져와주기
        nature_layer_gdf = nature_layers.get(nature_type)
        # 없으면 비율에 None 반환 (0이 아닌 이유는 데이터 자체가 없기 때문)
        if nature_layer_gdf is None:
            metrics[f"{nature_type}_ratio"] = None
            continue
        # 자연 polygon에 대해서 route_buffer이 겹치는 공간을 나타낸 비율.
        intersecting_indices = list(nature_layer_gdf.sindex.query(route_buffer, predicate="intersects"))
        if not intersecting_indices:
            metrics[f"{nature_type}_ratio"] = 0.0
            continue
        # 앞에서 경로 버퍼에 포함되는 환경들만 가져와주기
        merged_nature_geometry = nature_layer_gdf.geometry.iloc[intersecting_indices].union_all()
        # 겹치는 비율 반환해주기 (버퍼 너비 대비 겹치는 면적 비율)
        metrics[f"{nature_type}_ratio"] = round(route_buffer.intersection(merged_nature_geometry).area / buffer_area_m2, 3)
    return metrics


if __name__ == "__main__":
    from pathlib import Path
    from algo.utils.graph import load_graph, NodeIndex
    from algo.routing.course import generate_course

    G = load_graph(str(Path(__file__).resolve().parent.parent / "data" / "서울_보행네트워크.graphml"))
    idx = NodeIndex(G)
    # 한강 가까운 출발점
    r = generate_course(G, idx, "loop", (37.5133, 127.0590), 4000)
    from pprint import pprint
    pprint(analyze_nature_adjacency(r["coords"]))
