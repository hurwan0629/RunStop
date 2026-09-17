---
title: "02. 특징 추출"
status: "현재 구현"
source_branch: "personal/hurwan"
source_commit: "ae22a6af6e0be2c9ad148652f9a9b920e1e6f904"
documented_at: "2026-09-10"
---

# 02. 특징 추출

> [!info] 빠른 위치 파악
> - **상태:** 현재 구현
> - **소스 위치:** `routing-worker/src/algo/features/*`
> - **역할:** 이미 만들어진 후보 경로를 DEM, 시설 CSV, 공원/하천 GeoJSON, OSM Graph로 측정해 raw feature를 추가한다.
> - **이전 단계:** [[../01. 후보 경로 생성/INDEX|01. 후보 경로 생성]]
> - **다음 단계:** [[../04. 점수화/INDEX|04. 점수화]]
> - **주요 입력:** Basic CandidateRoute
> - **주요 출력:** slope/facilities/nature/surface가 추가된 CandidateRoute

## 전체 흐름

```text
CandidateRoute
│
├─ coords
│   ├─ DEM ─────────────→ slope
│   ├─ 통합 시설 CSV ───→ facilities
│   └─ 공원/하천 GeoJSON → nature
│
└─ nodes + G
    └─ OSM edge/node ───→ surface
```

`pipeline.py`의 현재 순서:

```python
c["slope"] = analyze_elevation_profile(c["coords"])
c["facilities"] = analyze_nearby_facilities(c["coords"])
c["nature"] = analyze_nature_adjacency(c["coords"])
c["surface"] = analyze_surface_profile(G, c["nodes"])
```

## 이 계층의 핵심 원칙

```text
경로 생성 = 어디로 갈지 결정
Feature   = 만들어진 길이 어떤 길인지 측정
Scoring   = 그 특성이 얼마나 좋은지 판단
```

Feature 단계에서는 가능하면 “좋다/나쁘다”를 결정하기보다 **측정값(raw feature)**을 보존한다.

## 추천 읽기 순서

1. [[01. Feature 계층 전체 흐름]]
2. [[02. Elevation - DEM과 경사]]
3. [[03. Facilities - 주변 시설]]
4. [[04. Nature - 공원과 하천]]
5. [[05. Surface - OSM 도로 환경]]
6. [[06. Feature Profile 데이터 형태]]
7. [[07. 현재 한계점]]
