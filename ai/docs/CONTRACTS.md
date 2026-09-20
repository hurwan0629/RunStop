# 인터페이스 계약 v1

## Dataset

Parquet 한 행은 한 요청의 후보 하나입니다. `candidate_id`는 요청 안에서 유일하며 서로 다른 요청에서 같아도 됩니다. `request_id`는 전체 데이터셋에서 요청을 유일하게 식별합니다.

| 필수 컬럼 | 타입·의미 |
|---|---|
| user_id / request_id / candidate_id | 비어 있지 않은 문자열; 모델 특성으로 사용하지 않음 |
| request_sequence | 사용자 내 양의 정수; JSON 배열 순서(1부터); 실제 시간은 아님 |
| condition_score | 유한 숫자; worker에서 반환한 기존 점수 |
| utility | [0,1] 유한 숫자; 합성 선호 점수 |
| ground_truth_rank | 높은 Utility 우선 dense rank: 동점은 같은 순위, 다음 순위 +1 |
| relevance | 정수 0..L-1; `min(L-1, floor(utility * L))` |

같은 요청의 후보는 user ID, 순서, 요청 특성, 프로필 특성이 같아야 합니다. 한 요청에 최소 2개 후보를 요구하며 생성 정책 기본 범위는 6..10입니다. 중복 후보, 중복 요청 순서, 정답과 순위/relevance 불일치, null ID를 거부합니다.

특성은 `user_weight_*`, `request_weight_*`, `request_target_distance_m`, `request_type_*`, `request_via_count`, `requirements_*`, `candidate_*`입니다. 모델 입력에서 `candidate_id`는 제외합니다. 경로 유형은 one-hot입니다. 프로필 persona 텍스트, 좌표 배열, 내부 nodes는 모델에 넣지 않습니다.

`candidate_*`는 거리(m), 거리 오차(%), 중복 비율(0..1), 예상 시간(분), 조건 충족(bool), `slope_*`(경사 %, 고도 m), `facilities_*`(개수·/km·최근접 m), `nature_*`(0..1), `surface_*`(비율·개수·/km)를 저장합니다. 수치형 결측은 null/NaN이며 무한값과 수치가 아닌 문자열은 거부합니다. 결측 대치는 학습 데이터 중앙값, 전체 결측 컬럼은 0, 결측 지표 추가 후 표준화합니다. Baseline에는 전처리가 없습니다.

`metadata.json`은 schema_version=1, status=complete, version, utility 전체 설정, candidates_sha256을 포함해야 합니다. 기본 생성기는 원본 JSON 해시, 공간 파일 해시, routing 알고리즘 코드 해시, 생성 설정, 실패 건수와 환경을 추가합니다. Loader는 데이터 파일 해시와 정답 규칙을 검증합니다.

## Model

```python
model = create_model(model_config, ordered_feature_columns, seed)
model.fit(train_df, validation_df)
scores = model.predict_scores(candidate_df)  # finite float array, shape (N,)
model.save(new_directory)
model = BaseRankingModel.load(directory)
```

추론은 Utility나 정답 컬럼을 요구하지 않습니다. 입력 컬럼 순서는 저장된 스키마를 사용하며 누락된 필수 특성은 오류입니다. 요청 간 점수 절대값 비교는 계약에 포함하지 않습니다. 분류 모델도 확률을 공통 출력 의미로 사용하지 않습니다.

현재 모든 학습 모델은 CPU를 사용합니다. 일부 모델의 내부 검증 지표는 기록용이며, 고정 반복 횟수/epoch로 학습합니다. 조기 종료나 최적 trial 자동 선택은 현재 지원하지 않습니다. `train.py`는 Train/Val만 모델에 전달하고 모든 모델에 공통 Val 지표를 생성합니다. Warm/Cold 평가는 `test.py`에서 저장된 모델을 복원해 실행합니다.

## Split and evaluation

Cold 사용자를 seed로 먼저 분리하고, 나머지 사용자별 유효 요청을 순서대로 나눕니다. Known 사용자의 마지막 test_requests개는 Warm test, 그 앞 validation_requests개는 validation, 나머지는 train입니다. 최소 요청 미달은 excluded/error 정책을 따릅니다. 요청 단위로만 분할하며 실제 배정표를 저장합니다.

평가 점수 동점은 candidate_id 오름차순으로 결정합니다. 정답 Utility 동점은 동일 선호로 취급합니다.

- NDCG@K: relevance의 `2^rel - 1` gain, log2 위치 할인. 모든 relevance가 0인 요청은 0으로 정의.
- Top1 best utility: 예측 1위가 해당 요청의 최대 Utility와 같으면 1. 공동 1위도 정답.
- Utility regret: 최대 Utility - 예측 1위 Utility, 낮을수록 좋음.
- Pairwise accuracy: Utility가 서로 다른 후보 쌍 중 예측 순서가 맞는 비율. 비교 가능한 쌍이 없으면 null.
- 학습은 Overall/Validation, 테스트는 Overall/Warm/Cold에서 요청별 지표를 동일 가중 평균. 신뢰구간은 사용자 단위 cluster bootstrap으로 반복 요청의 종속성을 보존. 유효 사용자가 2명 미만이거나 bootstrap_samples=0이면 신뢰구간 null.

실제 선택 데이터가 없으므로 selected/HitRate/MRR을 가정해서 생성하지 않습니다.

## Artifacts

UTC 시각 + 단계(train/test) + 실험 이름 + 임의 suffix로 새 폴더를 만들며 덮어쓰지 않습니다.
Test는 학습 당시 저장된 배정표를 복원하며 데이터와 metadata, 모델·설정·분할표의 해시를 검사합니다. 분할을 다시 생성하거나 모델·전처리를 fit하지 않습니다. 기존 stage 없는 완료된 artifact도 지원합니다.

```text
TRAIN_RUN/
  manifest.json                   stage=train, running / complete / failed, 파일 해시와 크기
  config.yaml                     기본값 포함 실행 설정
  dataset_reference.json          원본 데이터 경로·해시·metadata 사본(Utility 포함)
  environment.json                Python·패키지·git·소스 해시
  runtime/ai/                     저장 당시 Python 소스 스냅샷
  model/model.pkl                 모델 및 fitted 전처리를 포함하는 번들
  model/input_schema.json         입력 컬럼 순서·타입·결측 처리·출력 계약
  split_assignments.parquet       제외 요청 포함 실제 요청 배정
  validation/predictions.parquet   Val 후보 특성·정답·모델/기존 점수·순위
  validation/request_metrics.parquet  Val 요청별 모델/기존 지표
  validation/metrics.json         Val 평균·CI·baseline 대비 차이
  resource_usage.json             학습·추론 시간·CPU 시간·샘플링 RSS·번들 크기
  diagnostics/training_history.json
  diagnostics/feature_importance.json  지원 모델만; 전처리 이후 컬럼 기준
  diagnostics/split_summary.json
  validation/plots/ranking_metrics.png
  run.log

TEST_RUN/                         원본 학습 결과 옆에 생성
  manifest.json                   stage=test, running / complete / failed
  training_reference.json         원본 학습 폴더·manifest/모델/분할표 해시
  config.yaml, dataset_reference.json, environment.json, runtime/
  predictions.parquet, request_metrics.parquet, metrics.json
  plots/ranking_metrics.png
  resource_usage.json, run.log
```

추론 시간은 요청별 전처리+예측을 포함하며 첫 호출을 제외하지 않습니다. CPU는 실험 프로세스의 모든 스레드 CPU 시간, RSS는 20ms 간격 샘플의 최대값입니다. OS 수준의 엄밀한 peak가 아니며 별도 자식 프로세스는 측정 범위 밖입니다. 모델 파일 크기는 전처리 포함 pickle 번들 크기입니다.

예측 artifact는 원본 좌표를 복제하지 않습니다. `model.pkl`은 이 실험 환경이 만든 신뢰할 수 있는 파일만 로드해야 합니다. 모델 import 경로와 pickle 저장 방식은 유지하며, 테스트 결과가 원본 모델을 변경하지 않습니다. routing-worker에 자동 배포하지 않습니다.
