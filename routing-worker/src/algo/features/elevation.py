"""
코스(coords)의 경사 프로파일. course.py 의 coords 만 소비한다.
고도값은 data/배포/query_elevation.py 의 DEM 조회(get_elevation)를 그대로 쓴다.
(기존 step8_slope_profile.py 포팅 + None 방어)
"""

import sys

# query_elevation.py + 서울_DEM_10m.npy + _meta.json 이 있는 폴더 (배포 패키지 기준)
from src.algo._datapaths import DEM_DIR
if str(DEM_DIR) not in sys.path:
    sys.path.insert(0, str(DEM_DIR))

# query_elevation.py는 DATA_ROOT/배포에 배치된다. DATA_ROOT 자체를
# 패키지로 가정하면 배포 환경과 실제 데이터 레이아웃이 어긋난다.
from query_elevation import get_elevation  # noqa: E402

from src.algo.utils.geo import haversine_m
from src.algo import config
from src.algo.types import Coordinate, ElevationProfile


def sample_route_coordinates(
    route_coordinates: list[Coordinate],
    sampling_interval_m: float = config.SLOPE_SAMPLE_M,
) -> list[Coordinate]:
    """
    폴리라인에서 대략 interval_m 간격으로 점을 뽑는다. None 이면 config.SLOPE_SAMPLE_M.
    리턴값은 list[tuple[float, float]]
    """
    if not route_coordinates:
        return []
    sampled_coordinates = [route_coordinates[0]]
    accumulated_distance_m = 0.0

    # 누적합 해주면서 샘플링보다 거리가 커질 때마다 초기화하면서 기록해서 반환해주기
    for start_coordinate, end_coordinate in zip(route_coordinates[:-1], route_coordinates[1:]):
        accumulated_distance_m += haversine_m(start_coordinate, end_coordinate)

        if accumulated_distance_m >= sampling_interval_m:
            sampled_coordinates.append(end_coordinate)
            accumulated_distance_m = 0.0
          
    if sampled_coordinates[-1] != route_coordinates[-1]:
        sampled_coordinates.append(route_coordinates[-1])
    return sampled_coordinates


def analyze_elevation_profile(
    route_coordinates: list[Coordinate],
    sampling_interval_m: float = config.SLOPE_SAMPLE_M,
) -> ElevationProfile:

    # 
    sampled_coordinates = sample_route_coordinates(route_coordinates, sampling_interval_m)
    elevations_m = [get_elevation(lat, lon) for lat, lon in sampled_coordinates]

    slope_percentages, total_elevation_gain_m = [], 0.0
    total_elevation_loss_m = 0.0

    # 각 구간별 [시작 위치, 종료 위치, 시작 위치 경사도, 종료 위치 경사도] 를 기준으로 데이터를 정리해주기
    for start_coordinate, end_coordinate, start_elevation_m, end_elevation_m \
      in zip(sampled_coordinates[:-1], sampled_coordinates[1:], elevations_m[:-1], elevations_m[1:]):

        # DEM 범위 밖 구간은 건너뜀
        if start_elevation_m is None or end_elevation_m is None:
            continue

        # 
        segment_distance_m = haversine_m(start_coordinate, end_coordinate)
        if segment_distance_m < config.MIN_SEGMENT_M:      # 0 나눗셈 방지
            continue
        # 통계를 위한 경사도 %로 누적시켜주기
        slope_percentages.append(abs(end_elevation_m - start_elevation_m) / segment_distance_m * 100)
        if end_elevation_m > start_elevation_m:
            total_elevation_gain_m += end_elevation_m - start_elevation_m
        elif end_elevation_m < start_elevation_m:
            total_elevation_loss_m += start_elevation_m - end_elevation_m

    if not slope_percentages:                        # 전 구간 DEM 없음
        return {"avg_slope_pct": None, "max_slope_pct": None,
                "slope_std_pct": None, "elevation_gain_m": None,
                "elevation_loss_m": None, "sample_count": len(sampled_coordinates)}

    avg_slope_pct = sum(slope_percentages) / len(slope_percentages)
    slope_std_pct = (
        sum((slope - avg_slope_pct) ** 2 for slope in slope_percentages)
        / len(slope_percentages)
    ) ** 0.5

    return {
        "avg_slope_pct": round(avg_slope_pct, 2),
        "max_slope_pct": round(max(slope_percentages), 2),
        "slope_std_pct": round(slope_std_pct, 2),
        "elevation_gain_m": round(total_elevation_gain_m, 1),
        "elevation_loss_m": round(total_elevation_loss_m, 1),
        "sample_count": len(sampled_coordinates),
    }


if __name__ == "__main__":
    # 남산(고지대) 넘어가는 가상 코스
    example_route_coordinates  = [
        (37.5512, 126.9882),   # 남산 정상 부근 ~253m
        (37.5563, 126.9723),   # 회현동 쪽 내리막
        (37.5636, 126.9850),   # 명동 ~30m
    ]
    print(analyze_elevation_profile(example_route_coordinates))
