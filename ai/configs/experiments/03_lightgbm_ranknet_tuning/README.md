# 03_lightgbm_ranknet_tuning

## 목적과 현재 상태

사용자 profile을 모델 입력으로 사용하지 않는 서비스 조건에서 **LightGBM과 RankNet의 하이퍼파라미터를 탐색하고, 성능과 안정성이 좋은 설정을 선정**한다.

모델당 16회, 총 32회의 추가 학습·Validation 평가를 계획한다. 이 예산 안에서 좋은 설정을 찾는 것이 목적이며, 가능한 모든 조합의 전역 최적값을 보장하는 실험은 아니다.

**2026-09-17: 1차 YAML 16개를 작성·검증하고, RankNet 8회·LightGBM 8회 학습·Validation 평가를 모두 완료했다.** 2차 집중 탐색·seed 반복·Warm/Cold Test는 아직 실행하지 않았다.

결과: [1차 요약](../../../artifacts/03_lightgbm_ranknet_tuning/01_first_round/result.md) · [전체 비교 CSV](../../../artifacts/03_lightgbm_ranknet_tuning/01_first_round/results.csv)

NDCG@3 최고 설정은 **RN06: lr=0.002, epochs=100 (0.997701)**과 **LG04: leaves=7, trees=800 (0.992343)**이다. Top1·Regret의 최고 설정은 일부 다르므로, 다음 4회 설정은 결과 요약의 지표별 차이를 확인한 뒤 결정한다.

1차 설정은 [ranknet/](ranknet/)과 [lightgbm/](lightgbm/)에 있다. 결과는 [01_first_round/](../../../artifacts/03_lightgbm_ranknet_tuning/01_first_round/) 안에 저장한다.

```text
artifacts/03_lightgbm_ranknet_tuning/01_first_round/
  ranknet/       RN01~RN08의 실행별 artifact
  lightgbm/      LG01~LG08의 실행별 artifact
  logs/          실행별 콘솔 로그
  .cache/        Matplotlib 캐시
  results.csv    16개 실행의 전체 비교표
  result.md      개요·결론·지표·자원·후속 해석
  comparison.png 파라미터별 NDCG·Regret 변화
```

## 출발점

이전 단계: [6개 모델 1차 실험 설정](../02_find_out_6_models_baseline/README.md)

결과 정리: [이전 실험 result.md](../../../artifacts/02_find_out_6_models_baseline/result.md)

| 모델 | 기준 설정 | Validation NDCG@3 | Top1 | Utility Regret | 이번 단계의 방향 |
| --- | --- | --- | --- | --- | --- |
| RankNet | learning_rate=0.001, epochs=30, hidden_dim=64 | 0.996557 | 81.66% | 0.001181 | 학습 횟수와 학습률을 먼저 확인하고, 필요하면 모델 크기·규제 조정 |
| LightGBM | num_leaves=15, n_estimators=200, learning_rate=0.05 | 0.987589 | 63.33% | 0.005456 | 리프 수와 트리 개수의 균형을 확인한 뒤 규제 조정 |

RankNet은 이전 세 학습률 모두 30번째 epoch에서 Validation pair loss가 가장 낮았다. 추가 학습을 확인할 근거는 있지만, loss 감소가 NDCG·Top1 개선을 보장하지는 않는다.

LightGBM은 num_leaves=31의 NDCG가 15보다 약 0.000084 높았지만, 15가 Top1·Regret·Pairwise와 학습 시간·모델 크기에서 유리했다. 기존 15·31·63 결과는 비교 기준으로 재사용한다.

## 실험 예산

| 단계 | 모델당 추가 실행 | 두 모델 합계 | 내용 |
| --- | --- | --- | --- |
| 1차 탐색 | 8회 | 16회 | 주요 파라미터 범위 비교 |
| 2차 집중 탐색 | 4회 | 8회 | 1차 결과가 좋은 영역에서 추가 조정 |
| 안정성 확인 | 4회 | 8회 | 모델별 상위 설정 2개를 각각 추가 seed 2개로 반복 |
| 합계 | **16회** | **32회** | 모델별 최종 후보 선정 |

- 기존 완료 실험은 기준점으로 재사용하며 추가 16회에 포함하지 않는다.
- 모델당 새 설정 탐색은 최대 12회, 나머지 4회는 같은 설정의 seed 반복이다.
- 상위 후보는 탐색 당시 실행을 포함해 설정당 seed 3개로 비교한다.
- 2차 집중 탐색의 4개 설정은 1차 8회 결과를 확인한 뒤 정한다. 처음부터 전체 16개 설정을 확정하지 않는다.
- 기존 실행과 완전히 같은 설정은 중복 생성하지 않는다. 해당 조합이 후보에 포함되면 기존 결과를 사용하고 새 조합에 예산을 배정한다.

## 공통 고정 조건

| 항목 | 고정값 |
| --- | --- |
| dataset_path | datasets/2026-09-14_11h17m54s_runstop_users_1000_5000_requests_behavioral/candidates.parquet |
| metadata_path | datasets/2026-09-14_11h17m54s_runstop_users_1000_5000_requests_behavioral/metadata.json |
| use_profile | **false** |
| use_request / use_requirements / use_candidate_features | true |
| use_condition_score / use_history | false |
| split.strategy | user_temporal_holdout |
| split.seed | **42 — 모든 단계에서 고정** |
| cold_user_ratio | 0.2 |
| validation_requests / test_requests / min_train_requests | 각각 1 |
| insufficient_user | exclude |
| evaluation.top_k | 3 |
| bootstrap_samples / confidence_level | 1000 / 0.95 |
| 탐색 단계 최상위 seed | 42 |

`use_profile: false`는 의도된 서비스 입력 조건이다. 이 실험 중 profile 입력을 켜거나 데이터·Utility 정의를 변경하지 않는다. 단, 기존 합성 정답의 Utility에는 profile 선호가 반영되어 있다는 점은 결과 해석에 유지한다.

기존 분할의 요청 수는 Train 1,109 / Validation 589 / Warm Test 589 / Cold Test 647 / Excluded 358이다. 새 실행도 같은 분할을 사용하는지 확인한다.

## RankNet 탐색 계획

### 1차: 8회

우선 **learning_rate × epochs**를 탐색한다.

- 학습률 후보: `0.0005`, `0.001`, `0.002`, `0.003`
- 학습 횟수 후보: `60`, `100`
- 위 두 축의 조합으로 8회 실행한다.
- 고정: `hidden_dim=64`, `depth=1`, `dropout=0.1`, `batch_size=256`, `weight_decay=0.01`, `optimizer=adamw`
- 기존 `lr=0.001, epochs=30`을 포함한 이전 결과와 비교해 학습 횟수를 늘린 이득과 비용을 확인한다.

현재 구현에는 자동 early stopping이나 최적 epoch 복원이 없다. 각 실행은 지정한 epochs까지 학습한 최종 모델을 평가한다.

### 2차: 4회

1차 결과에서 선정한 학습률·학습 횟수를 기준으로 필요한 축만 추가 탐색한다.

| 우선순위 | 파라미터 | 후보 범위 | 확인 목적 |
| --- | --- | --- | --- |
| 1 | hidden_dim | 32 / 64 / 128 | 더 작은 모델로 성능 유지가 가능한지, 표현력 증가의 이득이 있는지 |
| 2 | dropout | 0.0 / 0.1 / 0.2 | 규제 강도에 따른 Validation 변화 |
| 3 | weight_decay | 0.001 / 0.01 / 0.1 | 필요한 경우 가중치 규제 조정 |

위 표는 전체 조합 실행 목록이 아니다. 기존 조합을 제외하고 **총 4개만** 선정하며, 기준 설정에서 한 번에 한 축을 변경해 해석 가능성을 유지한다. depth와 batch_size는 우선 고정한다.

## LightGBM 탐색 계획

### 1차: 8회

우선 **num_leaves × n_estimators**를 탐색한다. 이전 결과에서 작은 리프 수가 유리했으므로 그 주변에 예산을 집중한다.

- 리프 수 후보: `7`, `15`
- 트리 개수 후보: `100`, `300`, `500`, `800`
- 위 두 축의 조합으로 8회 실행한다.
- 고정: `learning_rate=0.05`, `max_depth=-1`, `min_child_samples=20`, `reg_lambda=0.0`, `n_jobs=1`
- 기존 `leaves=15, n_estimators=200`과 비교해 트리를 줄였을 때의 성능 유지 여부와 늘렸을 때의 추가 이득을 확인한다.
- 이전 `leaves=31/63, n_estimators=200` 결과도 참고하되, 큰 리프 수로 범위를 확대할지는 결과를 보고 결정한다.

### 2차: 4회

1차 결과에서 선정한 리프 수·트리 개수를 기준으로 규제를 조정한다.

| 우선순위 | 파라미터 | 후보 범위 | 확인 목적 |
| --- | --- | --- | --- |
| 1 | min_child_samples | 10 / 20 / 40 | 리프를 더 세밀하게 나누거나 제한할 때의 변화 |
| 2 | reg_lambda | 0.0 / 0.1 / 1.0 | L2 규제를 추가했을 때의 변화 |

기존 조합을 제외하고 총 4개를 정한다. 예를 들어 기준이 min_child_samples=20, reg_lambda=0이면, min_child_samples만 10·40으로 바꾼 2개와 reg_lambda만 0.1·1.0으로 바꾼 2개를 비교할 수 있다. learning_rate와 n_jobs는 유지한다.

## 안정성 확인: 모델당 4회

1. 모델별로 기존 기준점과 이번 탐색 결과에서 상위 설정 2개를 선정한다.
2. 각 설정에 최상위 `seed=7`, `seed=2026`을 적용해 2회씩 추가 실행한다.
3. 기존 `seed=42` 실행과 합쳐 설정당 3개 seed의 지표 평균·표준편차·최솟값을 비교한다.
4. **split.seed는 계속 42로 고정**한다. 이 단계에서는 학습 무작위성의 영향을 확인하며, 데이터 분할 변동을 동시에 섞지 않는다.

현재 코드의 최상위 seed는 모델 학습뿐 아니라 평가 bootstrap에도 전달된다. seed 반복 시 신뢰구간의 재표본 추출도 달라지므로, 반복 평균 성능과 각 실행의 bootstrap CI는 구분해 기록한다.

## 평가와 선정 기준

- 주지표: **Validation NDCG@3**
- 보조지표: **Utility Regret, Top1 Best Utility, Pairwise Accuracy**
- 자원: 학습 시간, 누적 CPU 시간, Peak RSS, 요청당 추론 시간, 저장 모델 크기
- 안정성: seed별 성능 편차와 최저 성능

NDCG 차이가 작고 seed 변동 범위와 비슷하면, NDCG 한 번의 최고값만으로 선정하지 않는다. Regret·Top1과 자원 비용을 함께 보고 선택 이유를 남긴다. 모델별 best를 먼저 선정한 뒤 RankNet과 LightGBM을 같은 기준으로 비교한다.

RankNet의 pair loss는 학습 상태를 보는 진단 지표다. 이전 결과에서도 loss가 낮은 설정이 NDCG·Top1·Regret에서 최고인 것은 아니었으므로, 최종 설정은 Validation 순위 지표로 고른다.

RankNet과 LightGBM은 현재 CPU 스레드 사용 조건이 다르다. 이번 자원 수치는 해당 실행 조건의 관측값으로 기록하며, 동일 CPU 예산의 서비스 벤치마크로 해석하지 않는다. 실제 배포 판단을 위한 스레드 제한·warmup·p95/p99 추론 측정은 이 32회 탐색과 별도 작업이다.

## 작업 순서와 산출물

- [x] 실험 목적·고정 조건·예산·선정 기준 문서화
- [x] 1차 탐색 YAML 작성: 모델ㅍ당 8개
- [x] YAML 검증 및 공통 데이터·특성·분할 조건 확인
- [x] 1차 탐색 실행 및 Validation·자원 비교
- [ ] 결과를 반영한 2차 YAML 작성: 모델당 4개
- [ ] 2차 탐색 실행 및 모델별 상위 설정 2개 선정
- [ ] 안정성 확인 YAML 작성·실행: 모델당 4개
- [ ] 모델별 최종 설정과 원본 artifact 경로 확정
- [ ] 전체 결과를 별도 결과 문서에 정리

후속 YAML은 각 단계와 모델·변경값을 구분할 수 있도록 이름을 정하고, 실행 결과는 `artifacts/03_lightgbm_ranknet_tuning/` 아래에 새 artifact로 저장하는 것을 계획한다. 기존 모델이나 결과 폴더를 덮어쓰지 않는다.

결과 문서에는 32회 실행 목록, 고정 조건, 모델별 변경값, Validation 지표, 사용 자원, 상위 후보의 seed별 변동, 최종 선택 이유를 포함한다.

## 최종 Test의 경계

이 계획의 32회는 모두 **학습·Validation 실험**이다. Warm/Cold Test는 탐색 예산에 포함하지 않으며, 파라미터를 선택하는 데 사용하지 않는다.

모델별 최종 설정과 평가 대상을 Validation 단계에서 확정한 뒤, 저장된 모델과 분할표로 Warm/Cold Test를 별도 수행한다. 최종 Test 결과를 보면서 다시 하이퍼파라미터를 튜닝하지 않는다.
