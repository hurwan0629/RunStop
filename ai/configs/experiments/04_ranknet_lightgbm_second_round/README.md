# 04_ranknet_lightgbm_second_round

## 목적

`03_lightgbm_ranknet_tuning`의 1차 Validation 결과를 바탕으로 RankNet과 LightGBM의 좋은 영역을 더 좁히는 **2차 집중 탐색**이다.

이번 단계에서는 기준 설정에서 **한 번에 한 축만 변경**한다. 성능이 변했을 때 어떤 파라미터가 영향을 주었는지 해석할 수 있도록 조합 탐색은 하지 않는다.

- RankNet 기준: `RN06` — `learning_rate=0.002`, `epochs=100`, `hidden_dim=64`, `dropout=0.1`
- LightGBM 기준: `LG04` — `num_leaves=7`, `n_estimators=800`, `min_child_samples=20`, `reg_lambda=0.0`
- 기준 실행은 1차 결과를 재사용하고 다시 학습하지 않는다.
- 이번 단계는 새 설정 **8회(RankNet 4 + LightGBM 4)**만 실행한다.
- 모델 선택에는 Validation만 사용하며 Warm/Cold Test는 아직 실행하지 않는다.

## 1차 결과 기준점

| 모델 | 기준 실험 | 핵심 설정 | Validation NDCG@3 | 의미 |
| --- | --- | --- | ---: | --- |
| RankNet | RN06 | lr=0.002, epochs=100, hidden=64, dropout=0.1 | 0.997701 | NDCG@3 및 Pairwise가 1차에서 가장 높음 |
| LightGBM | LG04 | leaves=7, trees=800, min_child=20, lambda=0 | 0.992343 | NDCG@3, Regret, Pairwise가 1차에서 가장 좋음 |

RankNet에서는 Top1과 Regret의 단일 최고 설정이 RN06과 다르지만, 이번 2차 실험은 계획한 주지표인 **Validation NDCG@3**을 기준으로 RN06을 출발점으로 사용한다. 최종 선정 시에는 Top1, Regret, Pairwise, 자원 사용량도 함께 본다.

## 공통 고정 조건

| 항목 | 값 |
| --- | --- |
| dataset | 1,000 users / 5,000 requests behavioral candidates |
| use_profile | false |
| split.strategy | user_temporal_holdout |
| split.seed | 42 |
| model seed | 42 |
| cold_user_ratio | 0.2 |
| validation_requests | 1 |
| test_requests | 1 |
| evaluation.top_k | 3 |
| bootstrap | 1,000 / 95% CI |

데이터, Feature 구성, Utility 정의, 분할 조건은 1차와 동일하게 유지한다.

## RankNet — 2차 4회

기준 `RN06`에서 `learning_rate=0.002`, `epochs=100`, `depth=1`, `batch_size=256`, `weight_decay=0.01`, `optimizer=adamw`를 고정한다.

| ID | hidden_dim | dropout | 기준 대비 변경 | 목적 |
| --- | ---: | ---: | --- | --- |
| RN06 (기준, 재사용) | 64 | 0.1 | - | 1차 Best 기준점 |
| RN09 | **32** | 0.1 | hidden 64 → 32 | 더 작은 모델에서도 성능이 유지되는지 확인 |
| RN10 | **128** | 0.1 | hidden 64 → 128 | 표현력 증가의 이득 확인 |
| RN11 | 64 | **0.0** | dropout 0.1 → 0.0 | 규제를 줄였을 때 개선 여부 확인 |
| RN12 | 64 | **0.2** | dropout 0.1 → 0.2 | 규제를 강화했을 때 일반화 개선 여부 확인 |

`weight_decay`는 이번 4회에서 고정한다. hidden/dropout 결과에서 규제 방향이 더 필요하다고 판단되면 안정성 확인 전 추가 후보로 검토한다.

## LightGBM — 2차 4회

기준 `LG04`에서 `num_leaves=7`, `n_estimators=800`, `learning_rate=0.05`, `max_depth=-1`, `n_jobs=1`을 고정한다.

| ID | min_child_samples | reg_lambda | 기준 대비 변경 | 목적 |
| --- | ---: | ---: | --- | --- |
| LG04 (기준, 재사용) | 20 | 0.0 | - | 1차 Best 기준점 |
| LG09 | **10** | 0.0 | min_child 20 → 10 | 더 세밀한 분기의 이득 확인 |
| LG10 | **40** | 0.0 | min_child 20 → 40 | 더 보수적인 분기의 일반화 확인 |
| LG11 | 20 | **0.1** | lambda 0 → 0.1 | 약한 L2 규제의 효과 확인 |
| LG12 | 20 | **1.0** | lambda 0 → 1.0 | 강한 L2 규제의 효과 확인 |

## 실행 명령

저장소 루트에서 실행한다.

```powershell
# RankNet
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/ranknet/RN09_hidden_32.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/ranknet/RN10_hidden_128.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/ranknet/RN11_dropout_0.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/ranknet/RN12_dropout_0p2.yaml

# LightGBM
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/lightgbm/LG09_min_child_10.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/lightgbm/LG10_min_child_40.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/lightgbm/LG11_reg_lambda_0p1.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/04_ranknet_lightgbm_second_round/lightgbm/LG12_reg_lambda_1.yaml
```

실행 전 YAML만 확인하려면 각 명령 끝에 `--validate-only`를 붙인다.

## 결과 저장 위치

```text
artifacts/04_ranknet_lightgbm_second_round/
  ranknet/
  lightgbm/
```

각 학습 실행은 기존 artifact를 덮어쓰지 않고 새 실행 폴더를 생성한다.

## 결과 비교표

실행 후 아래 표를 채운다. 기준 RN06/LG04는 1차 결과를 그대로 가져온다.

| ID | 변경사항 | NDCG@3 ↑ | Top1 ↑ | Regret ↓ | Pairwise ↑ | Train sec ↓ | Model MiB ↓ |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| RN06 | 기준 | 0.997701 |  |  |  |  |  |
| RN09 | hidden 64→32 |  |  |  |  |  |  |
| RN10 | hidden 64→128 |  |  |  |  |  |  |
| RN11 | dropout 0.1→0.0 |  |  |  |  |  |  |
| RN12 | dropout 0.1→0.2 |  |  |  |  |  |  |
| LG04 | 기준 | 0.992343 |  |  |  |  |  |
| LG09 | min_child 20→10 |  |  |  |  |  |  |
| LG10 | min_child 20→40 |  |  |  |  |  |  |
| LG11 | lambda 0→0.1 |  |  |  |  |  |  |
| LG12 | lambda 0→1.0 |  |  |  |  |  |  |

## 선정 기준

1. 주지표는 **Validation NDCG@3**이다.
2. NDCG 차이가 매우 작으면 Utility Regret, Top1, Pairwise Accuracy를 함께 본다.
3. 성능 차이가 사실상 없으면 학습 시간과 모델 크기가 작은 설정을 선호한다.
4. 이번 2차 결과에서 모델별 상위 설정 2개를 고른 뒤, 기존 계획대로 다른 model seed를 사용해 안정성 확인을 진행한다.
5. Warm/Cold Test 결과를 본 뒤 다시 하이퍼파라미터를 조정하지 않는다.

## 체크리스트

- [x] 1차 결과에서 기준 설정 확정
- [x] RankNet 2차 YAML 4개 작성
- [x] LightGBM 2차 YAML 4개 작성
- [ ] YAML `--validate-only` 확인
- [ ] RankNet 4회 실행
- [ ] LightGBM 4회 실행
- [ ] 1차 기준점과 2차 결과 비교
- [ ] 모델별 상위 설정 2개 선정
- [ ] seed 반복 안정성 확인 단계로 이동
