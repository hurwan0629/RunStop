"""
추천 코스를 HTML 지도로 그린다 (folium).

    python draw_map.py LOOP 3
    python draw_map.py ONE_WAY 3 --end 37.5045 127.0400
    python draw_map.py ROUND_TRIP 5 --start 37.5563 126.9723
    python draw_map.py LOOP 5 --via 37.5045 127.0490            # 경유지 (여러 번 가능)

결과: routes_map.html  (브라우저로 열기)
"""

from __future__ import annotations

import argparse
from pathlib import Path

import folium

from graph import NodeIndex
from pipeline import recommend

HERE = Path(__file__).resolve().parent
GRAPHML = HERE / "data" / "서울_보행네트워크.graphml"
COLORS = ["#1f77b4", "#2ca02c", "#9467bd", "#ff7f0e", "#d62728"]


def _load_graph():
    if GRAPHML.exists():
        from graph import load_graph
        print(f"[그래프] {GRAPHML.name} 로드 중...")
        return load_graph(str(GRAPHML))
    from graph import grid_graph
    print("[그래프] graphml 없음 -> 격자")
    return grid_graph(90, 90, 100, origin=(37.475, 126.985))


def main():
    p = argparse.ArgumentParser()
    p.add_argument("route_type", nargs="?", default="LOOP",
                   choices=["LOOP", "ONE_WAY", "ROUND_TRIP"])
    p.add_argument("target_km", nargs="?", type=float, default=3.0)
    p.add_argument("--start", nargs=2, type=float, default=[37.4979, 127.0276],
                   metavar=("LAT", "LON"), help="기본: 강남역")
    p.add_argument("--end", nargs=2, type=float, default=None, metavar=("LAT", "LON"),
                   help="ONE_WAY 필수")
    p.add_argument("--via", action="append", nargs=2, type=float, metavar=("LAT", "LON"),
                   help="반드시 지날 경유지 (여러 번 지정 가능)")
    p.add_argument("--out", type=Path, default=HERE / "routes_map.html")
    a = p.parse_args()

    start = tuple(a.start)
    end = tuple(a.end) if a.end else None
    vias = [tuple(v) for v in a.via] if a.via else None

    G = _load_graph()
    idx = NodeIndex(G)
    print(f"[추천] {a.route_type} {a.target_km}km"
          + (f"  경유지 {len(vias)}개" if vias else "") + " ...")
    cands = recommend(G, idx, a.route_type, start, a.target_km, end=end, vias=vias)
    if not cands:
        raise SystemExit("후보 없음 (ONE_WAY 는 목표거리 > 직선거리 여야 함)")

    m = folium.Map(location=start, zoom_start=15, tiles="OpenStreetMap")
    folium.Marker(start, tooltip="출발", icon=folium.Icon(color="green")).add_to(m)
    if end:
        folium.Marker(end, tooltip="도착", icon=folium.Icon(color="red")).add_to(m)
    for j, v in enumerate(vias or [], 1):
        folium.Marker(v, tooltip=f"경유지 {j}",
                      icon=folium.Icon(color="orange", icon="flag")).add_to(m)

    all_pts = []
    for i, c in enumerate(cands):
        s, f = c["slope"], c["facilities"]
        tip = (f"#{i+1}  {c['actual_distance_m']}m (오차 {c['distance_error_pct']}%)  "
               f"겹침 {c['overlap_ratio']}<br>"
               f"경사 avg {s['avg_slope_pct']}% / 오르막 {s['elevation_gain_m']}m<br>"
               f"화장실 {f['toilet_count']} · 편의점 {f['store_count']} · "
               f"공원 {f['park_count']} · CCTV {f['cctv_count']}")
        folium.PolyLine(c["coords"], color=COLORS[i % len(COLORS)], weight=5,
                        opacity=0.8, tooltip=tip).add_to(m)
        all_pts.extend(c["coords"])

    m.fit_bounds([[min(p[0] for p in all_pts), min(p[1] for p in all_pts)],
                  [max(p[0] for p in all_pts), max(p[1] for p in all_pts)]])
    m.save(str(a.out))
    print(f"[저장] {a.out}  — 브라우저로 여세요")


if __name__ == "__main__":
    main()
