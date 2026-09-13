# 모델 설정과 확장

`src/config/schema.py`의 PARAM_SCHEMAS가 HTML·YAML·CLI의 단일 파라미터 규격입니다. `src/models/registry.py`는 실제 구현 클래스와 선택 라이브러리를 등록합니다. 파라미터 오타와 다른 모델의 옵션은 extra=forbid로 거부합니다.

| name | 학습 방식 | 공개 파라미터 |
|---|---|---|
| condition_score_baseline | 기존 점수 그대로 | 없음 |
| logistic_regression | 같은 요청의 Utility 선호 쌍 차이에 Logistic 회귀. 양/음 차이를 모두 사용; 절편 없음 | C, max_iter, solver, class_weight |
| random_forest | Utility pointwise 회귀 | n_estimators, max_depth, min_samples_leaf, max_features, n_jobs |
| lightgbm_ranker | relevance + request group, lambdarank | n_estimators, learning_rate, num_leaves, max_depth, min_child_samples, reg_lambda, n_jobs |
| xgboost_ranker | relevance + request group, rank:ndcg | n_estimators, learning_rate, max_depth, min_child_weight, reg_lambda, n_jobs |
| catboost_ranker | relevance + request group, YetiRank | iterations, learning_rate, depth, l2_leaf_reg, thread_count |
| ranknet | 같은 요청의 Utility 선호 쌍, BCEWithLogitsLoss(score_good-score_bad,1) | hidden_dim, dropout, epochs, batch_size, learning_rate, weight_decay, optimizer |

모든 모델은 후보마다 점수 하나를 반환합니다. 학습 seed는 실험 seed를 전달합니다. LightGBM/XGBoost/CatBoost는 학습 전에 요청별 행을 연속 배치하고 group 크기/ID를 전달합니다. 전처리는 Train만 사용하여 fit합니다. 모델 내부의 기본 objective와 장치 등은 고정된 어댑터 정책이며 UI에서 임의 변경하지 않습니다.

확장 절차:

1. Strict를 상속한 파라미터 스키마를 만들고 타입·범위·설명을 정의합니다.
2. ModelConfig의 name Literal, PARAM_SCHEMAS, registry.MODELS에 같은 이름을 등록합니다.
3. BaseRankingModel을 상속하고 fit/predict_scores를 구현합니다.
4. 서로 다른 후보 수·행 순서·결측이 있는 작은 테스트에서 학습, 점수 방향, 저장·복원을 검증합니다.
5. export가 독립적으로 실행되도록 필요한 라이브러리를 export_model.py의 패키지 목록에 등록합니다.

UI는 스키마를 읽어 입력 폼을 생성하므로 모델별 필드를 HTML에 다시 작성할 필요가 없습니다. 설치 여부는 현재 UI Python에서 모듈을 찾을 수 있는지로 표시하며, 설치됨이 대규모 실제 데이터 검증을 의미하지 않습니다.

API 참고: [Pydantic JSON Schema](https://docs.pydantic.dev/latest/concepts/json_schema/), [LightGBM Ranker](https://lightgbm.readthedocs.io/en/stable/pythonapi/lightgbm.LGBMRanker.html), [XGBoost Learning to Rank](https://xgboost.readthedocs.io/en/stable/tutorials/learning_to_rank.html), [CatBoost Ranker](https://catboost.ai/en/docs/concepts/python-reference_catboostranker), [PyTorch BCEWithLogitsLoss](https://docs.pytorch.org/docs/stable/generated/torch.nn.BCEWithLogitsLoss.html).
