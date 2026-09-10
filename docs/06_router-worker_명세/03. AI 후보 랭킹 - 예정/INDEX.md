---
title: "03. AI 후보 랭킹 - 예정"
status: "예정 - 아직 구현되지 않음"
source_branch: "personal/hurwan"
source_commit: "ae22a6af6e0be2c9ad148652f9a9b920e1e6f904"
documented_at: "2026-09-10"
---

# 03. AI 후보 랭킹 - 예정

> [!info] 빠른 위치 파악
> - **상태:** 예정 - 아직 구현되지 않음
> - **소스 위치:** `미구현`
> - **역할:** Feature가 완성된 후보들을 사용자 선호 기반으로 랭킹하는 계층을 향후 삽입하기 위한 자리다.
> - **이전 단계:** [[../02. 특징 추출/INDEX|02. 특징 추출]]
> - **다음 단계:** [[../04. 점수화/INDEX|04. 점수화]]
> - **주요 입력:** 예정: feature-enriched candidates + 사용자 정보
> - **주요 출력:** 예정: ranking된 후보 / Top-K

> [!warning] 현재 코드에는 존재하지 않음
> 아래는 구현 세부 명세가 아니라 **삽입 위치와 책임의 방향만 기록**한다.

## 예정 위치

현재:

```text
후보 pool
→ Feature
→ heuristic Scoring
→ Top 3
```

검토 중인 방향:

```text
후보 pool (최대 8)
→ Feature
→ AI Ranking
→ Top 3
→ 기존 Score를 설명/정책/fallback에 활용
```

## 예정 역할

- 후보 경로들의 raw feature와 사용자 정보를 입력으로 사용
- 사용자가 선택할 가능성이 높은 후보 순서를 예측
- 최종적으로 사용자 친화적인 Top-K 후보 선택에 기여

## 아직 정하지 않은 것

- 모델 종류
- 학습 loss
- 정확한 feature schema
- 사용자 profile update 방식
- AI score와 기존 `condition_score`의 결합 규칙
- fallback 조건

따라서 현재 문서에서는 이 이상을 확정 사양으로 적지 않는다.
