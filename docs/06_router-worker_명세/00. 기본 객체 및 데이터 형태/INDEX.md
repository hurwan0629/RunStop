---
title: "00. 기본 객체 및 데이터 형태"
status: "현재 구현"
source_branch: "personal/hurwan"
source_commit: "ae22a6af6e0be2c9ad148652f9a9b920e1e6f904"
documented_at: "2026-09-10"
---

# 00. 기본 객체 및 데이터 형태

> [!info] 빠른 위치 파악
> - **상태:** 현재 구현
> - **소스 위치:** `routing-worker/src/algo/types.py / utils/geo.py / utils/graph.py`
> - **역할:** 알고리즘 전체에서 공통으로 사용하는 좌표, 그래프, 노드/엣지 경로, 사용자 조건, CandidateRoute 구조를 먼저 정의한다.
> - **이전 단계:** [[../README|문서 루트]]
> - **다음 단계:** [[../01. 후보 경로 생성/INDEX|01. 후보 경로 생성]]
> - **주요 입력:** 소스의 타입 정의와 NetworkX/좌표 유틸
> - **주요 출력:** 뒤의 모든 문서에서 공통으로 사용하는 용어

## 추천 읽기 순서

1. [[01. Coordinate와 좌표계]]
2. [[02. G - MultiDiGraph]]
3. [[03. NodeIndex]]
4. [[04. NodePath EdgeSet EdgeKey]]
5. [[05. RouteType과 RouteMode]]
6. [[06. Weights와 Requirements]]
7. [[07. CandidateRoute와 데이터 생명주기]]

## 한 장으로 보기

```text
Coordinate(lat, lon)
      ↓ snap
NodeIndex
      ↓
NodeId ───────────────┐
                      │
G: MultiDiGraph       │
node(x,y,...)          │
edge(length,...)       │
      ↓                │
NodePath ←─────────────┘
      ↓
CandidateRoute
```

> [!tip]
> `CandidateRoute`는 API 응답 DTO가 아니라 **알고리즘 내부에서 계층을 지나며 필드가 추가되는 작업 객체**로 이해하면 쉽다.
