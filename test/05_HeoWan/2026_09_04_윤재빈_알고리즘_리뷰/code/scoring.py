"""
코스 주변 시설 스코어. course.py 의 coords 만 소비한다.
data/배포/서울_시설데이터_통합.csv (유형/명칭/위도/경도/...) 한 파일을 유형별로 나눠 쓴다.
버퍼/거리는 반드시 미터 좌표(EPSG:5179)에서. (기존 step9 포팅 + 시설 확장)
"""

import numpy as np
import pandas as pd
from shapely import LineString, contains_xy, distance, points as sh_points

from geo import to_5179

FACIL_CSV = "C:/LANG_CHAIN_2026/MidProject/test/05_HeoWan/2026_09_04_윤재빈_알고리즘_리뷰/code/data/서울_시설데이터_통합.csv"   # 환경에 맞게 수정

# 유형(한글, CSV) -> 결과 키(영문)
KINDS = {"화장실": "toilet", "편의점": "store", "도시공원": "park",
         "가로등": "light", "보안등": "security", "보행등": "walklight",
         "CCTV": "cctv"}

_CACHE = {}


def _load():
    """통합 CSV를 한 번만 읽어 유형별 (N,2) 미터좌표 배열로 캐시."""
    if _CACHE:
        return _CACHE
    df = pd.read_csv(FACIL_CSV, low_memory=False).dropna(subset=["위도", "경도"])
    for kind, g in df.groupby("유형"):
        xs, ys = to_5179.transform(g["경도"].to_numpy(), g["위도"].to_numpy())
        _CACHE[kind] = np.column_stack([xs, ys])
    return _CACHE


def _project_line(coords):
    return LineString([to_5179.transform(lon, lat) for lat, lon in coords])


def score_route(coords, buffer_m=100):
    line = _project_line(coords)
    buf = line.buffer(buffer_m)
    route_km = line.length / 1000
    cache = _load()

    out = {"route_length_km": round(route_km, 2), "buffer_m": buffer_m}
    minx, miny, maxx, maxy = buf.bounds

    for kind, key in KINDS.items():
        pts = cache.get(kind)
        if pts is None or len(pts) == 0:
            out[f"{key}_count"], out[f"{key}_per_km"], out[f"{key}_nearest_m"] = 0, 0.0, None
            continue

        # 1차: 버퍼 bounding box 안의 점만 추림
        m = ((pts[:, 0] >= minx) & (pts[:, 0] <= maxx) &
             (pts[:, 1] >= miny) & (pts[:, 1] <= maxy))
        near = pts[m]
        if len(near) == 0:
            out[f"{key}_count"], out[f"{key}_per_km"], out[f"{key}_nearest_m"] = 0, 0.0, None
            continue

        # 2차: 버퍼 폴리곤 안 개수 + 코스 선까지 최근접 거리 (벡터 연산)
        n = int(contains_xy(buf, near[:, 0], near[:, 1]).sum())
        dmin = float(distance(line, sh_points(near[:, 0], near[:, 1])).min())

        out[f"{key}_count"] = n
        out[f"{key}_per_km"] = round(n / route_km, 2) if route_km else 0.0
        out[f"{key}_nearest_m"] = round(dmin, 1)

    return out


if __name__ == "__main__":
    from pprint import pprint
    route = [(37.4979, 127.0276), (37.5020, 127.0276),
             (37.5020, 127.0330), (37.4979, 127.0330), (37.4979, 127.0276)]
    pprint(score_route(route, buffer_m=100))
