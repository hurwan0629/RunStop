---
title: "RunStop Algorithm Docs"
status: "현재 구현 기준"
source_branch: "personal/hurwan"
source_commit: "ae22a6af6e0be2c9ad148652f9a9b920e1e6f904"
documented_at: "2026-09-10"
---

# RunStop Algorithm Docs

> [!important] 이 문서의 기준
> 이 묶음은 **`personal/hurwan` / `ae22a6a`** 기준 현재 구현을 설명한다.
> 아직 구현되지 않은 내용은 **예정** 또는 **인지된 한계**로만 표시하며, 현재 동작과 섞지 않는다.

## 문서를 읽는 순서

1. [[00. 기본 객체 및 데이터 형태/INDEX|00. 기본 객체 및 데이터 형태]]
2. [[01. 후보 경로 생성/INDEX|01. 후보 경로 생성]]
3. [[02. 특징 추출/INDEX|02. 특징 추출]]
4. [[03. AI 후보 랭킹 - 예정/INDEX|03. AI 후보 랭킹 - 예정]]
5. [[04. 점수화/INDEX|04. 점수화]]
6. [[99. 사용 데이터 출처/INDEX|99. 사용 데이터 출처]]

## 현재 실제 실행 흐름

```text
Node/API 요청
   ↓
recommend()
   ↓
RouteType → RouteMode
   ↓
후보 생성
   ├─ 일반: generate_candidates → generate_course → _build
   └─ Via : generate_candidates_via → generate_course_via → _route_chain
   ↓
Weighted Dijkstra
   ↓
후보 pool (거리/겹침/중복 필터, 최대 8)
   ↓
Feature Extraction
   ├─ slope
   ├─ facilities
   ├─ nature
   └─ surface
   ↓
현재 heuristic scoring
   ↓
condition_score 정렬
   ↓
Top-K (기본 3)
```

> [!note] 03. AI 후보 랭킹
> 현재는 구현되어 있지 않다. 향후 **특징 추출 이후 / 최종 점수화 이전**에 삽입하는 방향만 기록한다.

## 핵심 객체의 변화

```text
Request + G + NodeIndex
        ↓
Basic CandidateRoute
        ↓
Feature-enriched CandidateRoute
        ↓
Scored CandidateRoute
        ↓
Top-K Recommendation
```

## 문서 작성 원칙

각 구현 문서는 가능한 한 같은 순서로 읽힌다.

```text
위치와 역할
→ 상호작용하는 모듈
→ 입력/출력
→ 전체 흐름
→ 핵심 구현
→ 계산식/예제
→ 주의사항
→ 인지된 한계
```

깊은 문서로 갈수록 실제 함수, 코드 조각, 계산식을 더 많이 보여준다.

## 현재 인지한 주요 변경 후보

아래는 **아직 현재 구현이 아니다.**

- 사용자 기본 weight에 pseudo-count 기반 population prior 도입 검토
- 거리 scale fitting에 반복별 damping 도입 검토
- ONE_WAY 타원 waypoint 선택 규칙 재검토
- Elevation feature에 `slope_std_pct`, `elevation_loss_m` 등 추가 검토
- 시설/자연 공용 `BUFFER_M=100`을 별도 상수로 분리하고 축소 검토
- 경로 길이의 canonical source를 `CandidateRoute.actual_distance_m`로 통일 검토
- Feature 이후 AI ranking 계층 추가 예정
- weighting의 고정 heuristic 임계값 재설계 예정

---

**다음:** [[00. 기본 객체 및 데이터 형태/INDEX]]
