---
title: "01. 후보 경로 생성"
status: "현재 구현"
source_branch: "personal/hurwan"
source_commit: "ae22a6af6e0be2c9ad148652f9a9b920e1e6f904"
documented_at: "2026-09-10"
---

# 01. 후보 경로 생성

> [!info] 빠른 위치 파악
> - **상태:** 현재 구현
> - **소스 위치:** `routing-worker/src/algo/routing/* + scoring/edge_cost.py + scoring/constraints.py`
> - **역할:** 사용자 출발/목표거리/경로종류/선호를 이용해 여러 경로 CandidateRoute를 생성하고 1차 후보 pool로 줄인다.
> - **이전 단계:** [[../00. 기본 객체 및 데이터 형태/INDEX|00. 기본 객체]]
> - **다음 단계:** [[../02. 특징 추출/INDEX|02. 특징 추출]]
> - **주요 입력:** G, NodeIndex, RouteMode, start/end/vias, target, weights, requirements
> - **주요 출력:** Feature가 아직 붙지 않은 CandidateRoute 최대 pool개

## 전체 분기

```text
recommend()
  │
  ├─ vias 없음
  │    ↓
  │  generate_candidates()
  │    ↓ bearing 반복
  │  generate_course()
  │    ↓
  │  _build()
  │    ↓
  │  shortest_path()
  │
  └─ vias 있음
       ↓
     generate_candidates_via()
       ↓ bearing 반복
     generate_course_via()
       ↓
     _route_chain()
       ↓ segment 반복
     shortest_path()
```

두 흐름 모두 마지막에는:

```text
distance / overlap filter
→ candidate similarity dedup
→ 최대 8개 candidate pool
```

## 추천 읽기 순서

1. [[01. 전체 호출 흐름]]
2. [[02. 일반 후보 생성 - generate_candidates]]
3. [[03. Via 후보 생성 - generate_candidates_via]]
4. [[04. Course 생성 - generate_course]]
5. [[05. Via Course 생성 - generate_course_via]]
6. [[06. _build와 RouteMode]]
7. [[07. _route_chain과 Via 연결]]
8. [[08. Waypoint - 원]]
9. [[09. Waypoint - 타원]]
10. [[10. Shortest Path]]
11. [[11. Edge Cost와 사용자 Weight]]
12. [[12. Requirements와 Constraint]]
13. [[13. 거리 Scale 보정]]
14. [[14. Candidate Pool 필터링]]
15. [[15. 현재 한계점]]

> [!warning]
> 이 폴더의 `현재 한계점`은 현재 팀이 문제를 모르고 있다는 뜻이 아니다. **이미 인지했고 수정/검토할 대상**을 명시적으로 기록한다.
