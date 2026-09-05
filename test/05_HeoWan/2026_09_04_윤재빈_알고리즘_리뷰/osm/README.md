# 서울 OSM 레이어 (freeze)

`osmnx` 로 서울 전역을 한 번 받아 로컬에 저장하고, `data/배포` 의 다른 CSV 레이어와 동일하게 쓴다.
"실시간 조회"가 아니라 파일로 고정 → 발표·재현 시 Overpass API 의존 제거.

## 만드는 것

| # | 레이어 | 소스 태그 | 출력 |
|---|---|---|---|
| 1 | 도보(보행 네트워크) | `network_type=walk` | `서울_보행네트워크.graphml` (+ `_edges.gpkg`) |
| 2 | 계단 유무 | `highway=steps` | `서울_계단.geojson`, `서울_계단.csv` |
| 3 | 교차로 | 그래프 노드 `street_count>=3` | `서울_교차로.csv` |
| 4 | 횡단보도(OSM 보완) | `highway=crossing` | `서울_횡단보도_osm.csv` |
| 5 | 공원 | `leisure=park` 등 폴리곤 | `서울_공원_osm.geojson`, `_centroid.csv` |
| 6 | 하천 | `natural=water`, `waterway=*` | `서울_하천_osm_polygon.geojson`, `_line.geojson` |

점 형태 레이어(계단 중점·교차로·횡단보도·공원 centroid)는 통합 스키마
`유형/명칭/위도/경도/자치구/비고` 로 `서울_OSM시설_통합_추가분.csv` 에도 합쳐 저장한다.

## 실행

```bash
python -m venv .venv && source .venv/bin/activate
pip install "osmnx>=2.0" geopandas shapely pyproj pyarrow
python data/osm/build_osm_layers.py
```

> anaconda 기본 환경은 numpy 1.x/2.x 바이너리 충돌(`_ARRAY_API not found`)이 있어
> 반드시 새 venv 에서 실행한다.

결과는 `data/osm/out/` 에 생성. `_meta.json` 으로 건수 확인 후 `data/배포` 로 승격한다.
`ox.settings.cache_folder` 는 기존 `cache/` 를 재사용하므로 중복 다운로드가 없다.

## 기존 데이터와의 관계

- **공원**: 기존 `전국도시공원정보표준데이터_서울_정제.csv`(1,786, 점) 와 OSM 폴리곤은 상호보완.
  코스가 공원을 "통과/인접" 하는지는 폴리곤이 유리.
- **횡단보도**: 기존 `서울_횡단보도_정제.csv`(39,036) 가 기준. OSM 본은 `tactile_paving`,
  `crossing:markings` 같은 속성 보강용 → 병합 시 좌표 근접 중복 제거 필요.
- **계단 / 교차로 / 도보**: 신규. 라우팅·경사 프로파일·안전 스코어에 사용.

## 좌표계

출력은 전부 `EPSG:4326`. 버퍼·거리 계산은 다운스트림에서 `EPSG:5179` 로 투영
(`algorithm/code/step9_facility_score.py` 와 동일 관례).

## 갱신

OSM 은 계속 바뀐다. 월 1회 재실행 권장. `out/_meta.json` 의 `generated` 로 수집 시점 추적.
