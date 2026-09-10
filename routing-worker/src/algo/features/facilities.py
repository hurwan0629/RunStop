"""
코스 주변 시설 스코어. course.py 의 coords 만 소비한다.
data/배포/서울_시설데이터_통합.csv (유형/명칭/위도/경도/...) 한 파일을 유형별로 나눠 쓴다.
버퍼/거리는 반드시 미터 좌표(EPSG:5179)에서. (기존 step9 포팅 + 시설 확장)
"""

import numpy as np
import pandas as pd
from shapely import LineString, contains_xy, distance, points as sh_points

from src.algo.utils.geo import to_5179
from src.algo._datapaths import FACIL_CSV as FACILITY_DATASET_PATH  # 배포 패키지 datasets/ 또는 RUNSTOP_DATA_DIR
from src.algo import config
from src.algo.types import Coordinate, FacilityProfile

# 유형(한글, CSV) -> 결과 키(영문)
FACILITY_TYPE_TO_KEY = {
  "화장실": "toilet",  # 있음
  "편의점": "store",  # 있음
  "도시공원": "park", # 있음
  "가로등": "light",  # 있음
  "보안등": "security",  # 있음
  "보행등": "walklight", # 없음
  "CCTV": "cctv" # 있음
}

_FACILITY_COORDINATES_CACHE = {}


def _load_facility_coordinates():
    """
    통합 CSV를 한 번만 읽어 유형별 (N,2) 미터좌표 배열로 캐시.
    dict[str, np(N, 2)] 를 반환
    """
    # 캐시 확인하기
    if _FACILITY_COORDINATES_CACHE:
        return _FACILITY_COORDINATES_CACHE

    # 캐시가 없으면 
    # DATA_ROOT / "배포" / "서울_시설데이터_통합.csv" 
    # 에서 데이터 읽어오기 csv에서 위도/경도 부분만 가져와주기
    facility_df = pd.read_csv(FACILITY_DATASET_PATH, low_memory=False).dropna(subset=["위도", "경도"])
    # 유형별로 데이터를 나누어 가져와주기
    # 유형에는 위의 FACILITY_TYPE_TO_KEY 안에 존재하는 것들이 주를 이룸
    # groupby를 이용해서 유형별로 타입을 나누어서 가져와주기
    for facility_type, facility_group_df in facility_df.groupby("유형"):
        # [x, y] 위치로 변형시켜주기
        projected_x, projected_y = to_5179.transform(facility_group_df["경도"].to_numpy(), facility_group_df["위도"].to_numpy())
        # 캐시에 아래에 추가해서 등록시켜주기
        _FACILITY_COORDINATES_CACHE[facility_type] = np.column_stack([projected_x, projected_y])
    return _FACILITY_COORDINATES_CACHE


def _create_projected_route_line(route_coordinates: list[Coordinate]) -> LineString:
    return LineString([to_5179.transform(lon, lat) for lat, lon in route_coordinates])


def analyze_nearby_facilities(
    route_coordinates: list[Coordinate],
    buffer_distance_m: float = config.BUFFER_M,
) -> FacilityProfile:
    """근처에 있는 시설들 목록 주기"""

    # LineString 받아오기
    route_line = _create_projected_route_line(route_coordinates)
    # 버퍼 만들어주기
    route_buffer = route_line.buffer(buffer_distance_m)

    # 거리 km 받아오기
    route_length_km = route_line.length / 1000
    # 시설 위경도들 받아오기
    facility_coordinates_by_type = _load_facility_coordinates()

    # 경로 거리 계산해주기
    metrics = {"route_length_km": round(route_length_km, 2), "buffer_m": buffer_distance_m}
    min_x, min_y, max_x, max_y = route_buffer.bounds

    # metirc에 각 시설별 데이터 가져와주기
    # - f"{key}_count": 버퍼 안에 존재하는 시설 개수
    # - f"{key}_per_km": 평균 개수
    # - f"{key}_nearest_m: 가장 가까운 시설의 거리
    for facility_type, key in FACILITY_TYPE_TO_KEY.items():
        # 실제로 csv 에 있는 데이터를 캐시 dict[str, numpy(N, 2)]에서 가져와주기
        facility_points_xy = facility_coordinates_by_type.get(facility_type)
        # 
        if facility_points_xy is None or len(facility_points_xy) == 0:
            metrics[f"{key}_count"], metrics[f"{key}_per_km"], metrics[f"{key}_nearest_m"] = 0, 0.0, None
            continue

        # 1차: 버퍼 bounding box 안의 점만 추림
        bounding_box_mask = ((facility_points_xy[:, 0] >= min_x) & (facility_points_xy[:, 0] <= max_x) &
             (facility_points_xy[:, 1] >= min_y) & (facility_points_xy[:, 1] <= max_y))
        nearby_points_xy = facility_points_xy[bounding_box_mask]
        if len(nearby_points_xy) == 0:
            metrics[f"{key}_count"], metrics[f"{key}_per_km"], metrics[f"{key}_nearest_m"] = 0, 0.0, None
            continue

        # 2차: 버퍼 폴리곤 안 개수 + 코스 선까지 최근접 거리 (벡터 연산)
        nearby_facility_count = int(contains_xy(route_buffer, nearby_points_xy[:, 0], nearby_points_xy[:, 1]).sum())
        nearest_distance_m = float(distance(route_line, sh_points(nearby_points_xy[:, 0], nearby_points_xy[:, 1])).min())

        metrics[f"{key}_count"] = nearby_facility_count
        metrics[f"{key}_per_km"] = round(nearby_facility_count / route_length_km, 2) if route_length_km else 0.0
        metrics[f"{key}_nearest_m"] = round(nearest_distance_m, 1)

    return metrics


if __name__ == "__main__":
    from pprint import pprint
    route = [(37.4979, 127.0276), (37.5020, 127.0276),
             (37.5020, 127.0330), (37.4979, 127.0330), (37.4979, 127.0276)]
    pprint(analyze_nearby_facilities(route))
