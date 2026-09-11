# 랭킹 모델 비교 계획서 (LightGBM 대안 검토)

> 대상 코드: [ranker.py](code/ranker.py) — 현재 `LGBMRanker(objective="lambdarank")` 로 학습, `conditionScore`(선형 규칙 기반) 대비 NDCG@3 개선폭을 비교하는 구조.

## 1. 배경 및 목적

- 현재는 사용자 로그가 없어 합성 데이터(`_synth_dataset`)로 LightGBM LambdaRank 모델을 학습하고, 규칙 기반 `conditionScore` 대비 개선폭을 NDCG@3로 검증하고 있음.
- 실서비스 로그가 쌓이기 전 단계이므로, **LightGBM 하나만 보고 결정하기보다 비교군을 같이 실험해서 선택 근거를 남기는 것**이 목적.
- 최종적으로는 "합성 데이터 단계"와 "실 로그 도입 단계" 양쪽에서 안정적으로 쓸 수 있는 모델을 고르는 게 목표.

## 2. 비교 대상 모델

| 모델 | 목적함수 | 선정 이유 | 우선순위 |
|---|---|---|---|
| LightGBM `LGBMRanker` (현행) | `lambdarank` | 베이스라인 | - |
| XGBoost `XGBRanker` | `rank:pairwise` / `rank:ndcg` | GBDT 계열 direct 비교, feature importance·하이퍼파라미터 감각 재사용 가능 | 1순위 |
| CatBoost | `YetiRank` / `YetiRankPairwise` | ordered boosting → 소규모 데이터(현재 500쿼리 수준)에서 과적합에 상대적으로 강함, 튜닝 부담 적음 | 2순위 |
| Pointwise 회귀 (RandomForestRegressor / GradientBoostingRegressor) | MSE (utility 직접 회귀) | LambdaRank 같은 listwise/pairwise 목적함수가 pointwise 대비 실제로 이득인지 확인하는 ablation | 3순위 |

- 신경망 기반 LTR(TF-Ranking 등)은 feature 17개·쿼리당 후보 3~8개 규모에서는 오버킬로 판단, 이번 비교에서 제외. 실 로그 규모가 커지면 재검토.

## 3. 평가 방법

- 지표: `_ndcg_by_group` 재사용, NDCG@3 기준 (현재 코드와 동일 기준선 유지).
- 비교 축:
  1. 각 모델 NDCG@3 vs `conditionScore`(규칙 기반) 개선폭
  2. 모델 간 NDCG@3 직접 비교
  3. feature importance 상위 항목이 모델별로 일관되는지 (`sub_surface`, `sub_flow` 등 비선형 항목이 잘 잡히는지)
- 데이터: 기존과 동일하게 `_synth_dataset(500, seed)` / `_synth_dataset(150, seed+1)` 사용, 시드 고정으로 모델 간 공정 비교.

## 4. 실험 절차

1. `ranker.py` 의 `train()` 구조를 재사용 가능한 형태로 분리 (모델 생성 부분만 교체 가능하게).
2. XGBoost, CatBoost, Pointwise 회귀 각각에 대해 동일 feature(`FEATURE_NAMES`, 17개) / 동일 train-test split으로 학습.
3. 모델별 NDCG@3, 학습 시간, 저장 모델 크기 기록.
4. 결과를 표로 정리해 비교 문서에 추가.

## 5. 일정 (1주 완료 기준, ~2026-09-18)

| 일자 | 내용 | 비고 |
|---|---|---|
| D1~D2 (09/11~09/12) | XGBoost 비교 스크립트 추가 및 결과 확인 | 최우선 |
| D3~D4 (09/13~09/16) | CatBoost, Pointwise ablation 추가 | 09/13~14 주말 |
| D5 (09/17) | 결과 종합, 표 정리 | |
| D6 (09/18) | 모델 선정 및 문서 기록 | 실 로그 도입 시점 기준으로 재검토 여지 남김 |

## 6. 리스크 / 고려사항

- 합성 데이터 기준 비교이므로, 실 로그 도입 후 순위가 바뀔 수 있음 → 이번 비교는 "1차 스크리닝" 용도로 한정.
- `routing-worker` 서빙 환경에 신규 라이브러리(xgboost/catboost) 추가 시 의존성·배포 크기 영향 확인 필요.
- 모델 교체 시 `predict_scores()` 인터페이스(`Booster` 로드 방식)가 모델마다 다르므로 서빙 코드 쪽 추상화 필요 여부 함께 검토.
