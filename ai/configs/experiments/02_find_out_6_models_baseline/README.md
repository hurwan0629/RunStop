# 02_find_out_6_models_baseline

## 목적

이 폴더는 **6개 학습 모델의 1차 Validation 기준선 탐색**을 위한 설정 묶음입니다.

현재 `hotfix` 실험 구조는 `train.py` 실행 시 Train으로 학습하고 Validation만 평가하며,
Warm/Cold Test는 별도의 `test.py`를 실행하기 전까지 사용하지 않습니다.
따라서 이 단계에서는 **Test 결과를 보지 않고 모델별로 대략적인 좋은 영역을 찾는 것**이 목적입니다.

총 구성:

- YAML 18개: 6개 모델 × low / baseline / high 3개
- README 1개
- 합계 19개

모든 YAML은 다음 조건을 동일하게 고정합니다.

- 동일 dataset / metadata
- `seed: 42`
- 동일 `user_temporal_holdout`
- `cold_user_ratio: 0.2`
- Validation 요청 1개 / Test 요청 1개 예약
- 동일 feature 설정
- `use_profile: true`
- `top_k: 3`
- bootstrap 1000 / 95% CI

즉 **한 모델 안에서는 핵심 파라미터 하나만 바꾸고 나머지는 고정**합니다.
이렇게 해야 결과 차이를 어떤 파라미터 변화 때문인지 설명하기 쉽습니다.

---

## 왜 이 파라미터들을 먼저 바꾸는가

| 모델 | 1차 변경 파라미터 | 값 | 이유 |
|---|---|---|---|
| Logistic Regression | `C` | 0.1 / 1 / 10 | L2 규제 강도를 직접 바꾸는 가장 대표적인 축 |
| Random Forest | `min_samples_leaf` | 1 / 2 / 5 | leaf가 얼마나 세밀하게 데이터에 맞출지 조절 |
| LightGBM Ranker | `num_leaves` | 15 / 31 / 63 | 트리 표현력/복잡도를 직접 조절 |
| XGBoost Ranker | `max_depth` | 3 / 6 / 9 | 트리 한 개의 복잡도를 직접 조절 |
| CatBoost Ranker | `depth` | 4 / 6 / 8 | CatBoost 트리 표현력의 핵심 축 |
| RankNet | `learning_rate` | 0.0003 / 0.001 / 0.003 | 역전파 갱신 크기와 학습 안정성을 먼저 확인 |

각 3개 값의 **가운데 값은 현재 RunStop 기본 YAML 값**입니다.

이번 단계에서는 파라미터 Cartesian Grid Search를 하지 않습니다.
예를 들어 LightGBM에서 `num_leaves`, `min_child_samples`, `reg_lambda`를 동시에 조합하면
실험 수가 빠르게 늘어나고 어떤 변화가 성능에 영향을 줬는지 해석하기 어려워집니다.

1차 결과에서 괜찮은 모델/설정만 골라 2차 실험에서 다른 파라미터를 추가로 확인하는 방식입니다.

---

## 파일 구성

```text
01_logistic_c_0p1.yaml
02_logistic_c_1.yaml
03_logistic_c_10.yaml

04_random_forest_leaf_1.yaml
05_random_forest_leaf_2.yaml
06_random_forest_leaf_5.yaml

07_lightgbm_leaves_15.yaml
08_lightgbm_leaves_31.yaml
09_lightgbm_leaves_63.yaml

10_xgboost_depth_3.yaml
11_xgboost_depth_6.yaml
12_xgboost_depth_9.yaml

13_catboost_depth_4.yaml
14_catboost_depth_6.yaml
15_catboost_depth_8.yaml

16_ranknet_lr_0p0003.yaml
17_ranknet_lr_0p001.yaml
18_ranknet_lr_0p003.yaml
```

---

## 결과를 볼 때의 우선순위

1차 비교에서는 아래 순서를 권장합니다.

1. **Validation NDCG@3**: Top 3 순서 품질의 주 지표
2. **Utility Regret**: NDCG relevance 구간 안에서 놓치는 미세 Utility 차이 보완
3. **Pairwise Accuracy**: 후보 쌍의 상대 순서 정확도
4. **Top1 Best Utility**: 실제 최고 Utility 후보를 1위로 올렸는지
5. 추론 시간 / 모델 크기: 성능이 거의 같을 때 실용적인 판단 기준

`NDCG@3`가 아주 조금 높은 설정 하나만 기계적으로 고르지 말고,
Bootstrap CI와 Utility Regret도 같이 확인하는 것이 좋습니다.

---

## 다음 단계

이 18개를 다 돌린 뒤에는 모델마다 Validation에서 괜찮은 설정 하나를 남깁니다.

```text
Logistic_best
RandomForest_best
LightGBM_best
XGBoost_best
CatBoost_best
RankNet_best
```

그 다음 6개 Best를 같은 Validation 기준으로 비교합니다.

성능이 좋은 2~3개 모델은 2차 파라미터 실험을 추가할 수 있습니다.
예를 들어 LightGBM의 `num_leaves`가 정해졌다면 다음에는
`min_child_samples` 또는 `reg_lambda`를 low / baseline / high로 확인합니다.

최종 모델과 파라미터가 고정된 후에만 저장된 artifact에 대해 `test.py`를 실행하여
Warm Test / Cold Test 최종 결과를 확인합니다.