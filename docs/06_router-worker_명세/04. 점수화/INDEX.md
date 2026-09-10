---
title: "04. 점수화"
status: "현재 구현"
source_branch: "personal/hurwan"
source_commit: "ae22a6af6e0be2c9ad148652f9a9b920e1e6f904"
documented_at: "2026-09-10"
---

# 04. 점수화

> [!info] 빠른 위치 파악
> - **상태:** 현재 구현
> - **소스 위치:** `routing-worker/src/algo/scoring/weighting.py`
> - **역할:** Feature raw value를 0~100 sub-score로 변환하고 사용자 weight로 condition_score를 만든다.
> - **이전 단계:** [[../03. AI 후보 랭킹 - 예정/INDEX|03. AI 후보 랭킹 - 예정]]
> - **다음 단계:** [[../99. 사용 데이터 출처/INDEX|99. 사용 데이터 출처]]
> - **주요 입력:** feature-enriched CandidateRoute, weights, requirements
> - **주요 출력:** sub_scores, condition_score, failed_conditions, exact_match, estimated_minutes

> [!important] 현재 구현
> 현재 pipeline에서는 **candidate pool 전체를 이 계층에서 점수화한 뒤 condition_score로 정렬하여 Top-K**를 고른다.
>
> `03. AI 후보 랭킹`은 미래 계획이며 아직 이 흐름을 바꾸지 않았다.

## 현재 흐름

```text
Raw Feature
    ↓
compute_sub_scores()
    ↓
0~100 sub_scores
    ↓
compute_condition_score()
    ↓
weighted average
    ↓
condition_score

동시에:
check_requirements()
→ failed_conditions
→ exact_match
```

## 추천 읽기 순서

1. [[01. 점수화 전체 흐름]]
2. [[02. Raw Feature와 Sub-score]]
3. [[03. Weighting 상수와 기준]]
4. [[04. 사용자 Weight 가중평균]]
5. [[05. Requirements 최종 검사]]
6. [[06. condition_score와 결과값]]
7. [[07. 현재 한계점]]
