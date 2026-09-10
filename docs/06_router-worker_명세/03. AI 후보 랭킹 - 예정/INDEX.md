---
title: "03. AI 후보 선택 계층"
status: "현재 구현 - AI 연동 전 fallback"
source_branch: "personal/hurwan"
source_commit: "ae22a6af6e0be2c9ad148652f9a9b920e1e6f904"
documented_at: "2026-09-10"
---

# 03. AI 후보 선택 계층

> [!info] 빠른 위치 파악
> - **상태:** 현재 구현 - AI 연동 전 fallback
> - **소스 위치:** `routing-worker/src/algo/ai/candidate_selector.py, routing-worker/src/algo/pipeline.py`
> - **역할:** 점수화가 끝난 후보들을 받아 최종 Top-K 후보를 선택한다.
> - **이전 단계:** [[../04. 점수화/INDEX|04. 점수화]]
> - **다음 단계:** API 응답
> - **주요 입력:** scored candidates, weights, requirements, top_k
> - **주요 출력:** Top-K CandidateRoute

> [!note]
> 현재 함수명은 AI 계층을 전제로 하지만, 내부 로직은 기존 `condition_score` 정렬을 그대로 사용한다.

## 현재 위치

```text
후보 pool (최대 8)
→ Feature
→ heuristic Scoring
→ select_candidates_with_ai()
→ Top 3
```

## 현재 역할

- AI 후보 선택을 넣을 위치를 `pipeline.py`에서 분리한다.
- 실제 AI 연동 전에는 `condition_score` 내림차순으로 정렬한다.
- `top_k` 개수만 잘라 API 응답 후보로 넘긴다.

## 남은 결정

- 모델 종류
- 사용자 profile update 방식
- AI score와 기존 `condition_score`의 결합 규칙
- fallback 조건과 장애 처리 방식
