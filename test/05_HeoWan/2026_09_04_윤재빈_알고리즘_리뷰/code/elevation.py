"""
코스(coords)의 경사 프로파일. course.py 의 coords 만 소비한다.
고도값은 data/배포/query_elevation.py 의 DEM 조회(get_elevation)를 그대로 쓴다.
(기존 step8_slope_profile.py 포팅 + None 방어)
"""

import sys
from pathlib import Path

# query_elevation.py + 서울_DEM_10m.npy + _meta.json 이 있는 폴더로 맞추세요
DEM_DIR = Path(__file__).parent / "data"
print(DEM_DIR)
sys.path.insert(0, str(DEM_DIR))
from data.query_elevation import get_elevation                  # noqa: E402

from geo import haversine_m


def sample_every(coords, interval_m=30.0):
    """폴리라인에서 대략 interval_m 간격으로 점을 뽑는다."""
    if not coords:
        return []
    out = [coords[0]]
    acc = 0.0
    for a, b in zip(coords[:-1], coords[1:]):
        acc += haversine_m(a, b)
        if acc >= interval_m:
            out.append(b)
            acc = 0.0
    if out[-1] != coords[-1]:
        out.append(coords[-1])
    return out


def slope_profile(coords, interval_m=30.0):
    pts = sample_every(coords, interval_m)
    elevs = [get_elevation(lat, lon) for lat, lon in pts]

    slopes, gain = [], 0.0
    for a, b, ea, eb in zip(pts[:-1], pts[1:], elevs[:-1], elevs[1:]):
        if ea is None or eb is None:      # DEM 범위 밖 구간은 건너뜀
            continue
        d = haversine_m(a, b)
        if d < 1:                         # 0 나눗셈 방지
            continue
        slopes.append(abs(eb - ea) / d * 100)
        if eb > ea:
            gain += eb - ea

    if not slopes:                        # 전 구간 DEM 없음
        return {"avg_slope_pct": None, "max_slope_pct": None,
                "elevation_gain_m": None, "sample_count": len(pts)}

    return {
        "avg_slope_pct": round(sum(slopes) / len(slopes), 2),
        "max_slope_pct": round(max(slopes), 2),
        "elevation_gain_m": round(gain, 1),
        "sample_count": len(pts),
    }


if __name__ == "__main__":
    # 남산(고지대) 넘어가는 가상 코스
    fake_route = [
        (37.5512, 126.9882),   # 남산 정상 부근 ~253m
        (37.5563, 126.9723),   # 회현동 쪽 내리막
        (37.5636, 126.9850),   # 명동 ~30m
    ]
    print(slope_profile(fake_route, interval_m=30))
