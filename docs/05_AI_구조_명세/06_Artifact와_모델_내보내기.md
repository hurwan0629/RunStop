# Artifact와 모델 내보내기

## 목표

한 번의 실험 결과를 나중에 다시 확인하거나 다른 모델과 공정하게 비교할 수 있게 **실행 당시 상태를 함께 저장**한다.

---

# 1. Run Artifact 기본 구조

대표 구조:

```text
RUN/
├─ manifest.json
├─ config.yaml
├─ dataset_reference.json
├─ environment.json
├─ runtime/
│  └─ ai/
├─ model/
│  ├─ model.pkl
│  └─ input_schema.json
├─ split_assignments.parquet
├─ predictions.parquet
├─ request_metrics.parquet
├─ metrics.json
├─ resource_usage.json
├─ diagnostics/
│  ├─ training_history.json
│  ├─ feature_importance.json
│  └─ split_summary.json
├─ plots/
│  └─ ranking_metrics.png
└─ run.log
```

실제 지원 여부에 따라 일부 Diagnostics는 비어 있거나 생략될 수 있다.

---

# 2. 파일별 의미

## `manifest.json`

Run 상태와 생성 파일의 Hash / Size를 관리한다.

```text
running
complete
failed
```

실패한 실험도 상태를 남겨 원인을 추적할 수 있게 한다.

## `config.yaml`

실제로 실행된 설정.

기본값이 채워진 상태를 남겨야 재현이 쉽다.

## `dataset_reference.json`

- Dataset 경로
- Dataset Hash
- Metadata 사본
- Utility Version / 설정

모델끼리 같은 데이터를 사용했는지 확인하는 핵심 근거다.

## `environment.json`

- Python Version
- Package Version
- Git 정보
- Source Hash

"코드는 같은데 왜 결과가 다르지?"를 추적할 때 사용한다.

## `runtime/ai/`

실험 당시 Python Source Snapshot.

이후 브랜치 코드가 바뀌어도 당시 실행 코드를 확인할 수 있다.

## `model/model.pkl`

Model과 Fitted Preprocessor를 포함한 Bundle.

> 신뢰할 수 없는 외부 pickle을 로드하는 용도로 사용하면 안 된다.

## `model/input_schema.json`

- 입력 Feature 순서
- Type
- 결측 처리
- Output Contract

운영 Inference에서 매우 중요하다.

## `split_assignments.parquet`

실제 Request가 Train / Validation / Warm / Cold / Excluded 중 어디로 갔는지 기록한다.

## `predictions.parquet`

Candidate별:

```text
Ground Truth
Model Score
Model Rank
Baseline Score
Baseline Rank
```

등을 분석할 수 있게 한다.

## `request_metrics.parquet`

Request 단위 Metric을 남긴다.

평균값만 저장하지 않기 때문에 Worst Case 분석이 가능하다.

## `metrics.json`

Cohort별 집계:

```text
Overall
Warm
Cold
```

및 CI / Baseline 대비 차이를 기록한다.

## `resource_usage.json`

대표 측정:

- 학습 Wall Time
- 추론 Wall Time
- CPU Time
- Sampling RSS Peak
- Model Bundle Size

현재 CPU Time은 Process의 User + System CPU Time 개념이며, RSS는 샘플링 기반이므로 OS 수준의 엄밀한 Peak와는 차이가 있을 수 있다.

---

# 3. 왜 Source Snapshot까지 남기는가

단순히 `model.pkl`만 남기면 다음 문제가 생긴다.

```text
어떤 Feature 순서였는지?
어떤 결측 처리였는지?
어떤 Utility 데이터였는지?
어떤 Commit이었는지?
어떤 Package Version이었는지?
```

그래서 Model 성능 수치보다 **재현 가능한 Run 전체를 Artifact**로 취급한다.

---

# 4. 모델 비교 전 확인

`compare_models.py`로 비교할 때 최소한 다음이 같아야 공정하다.

- Dataset / Metadata Hash
- Utility 설정
- 실제 Split
- Metric 설정

다르면 "모델 차이"인지 "실험 조건 차이"인지 구분할 수 없다.

---

# 5. Export

실험 Artifact에서 독립 추론 번들을 만든다.

```powershell
./ai/.venv-win/Scripts/python.exe ai/scripts/export_model.py `
  --artifact ai/artifacts/RUN_A `
  --output ai/artifacts/export_v001
```

목표는 다음이다.

```text
Export Directory
├─ Model
├─ Input Schema
├─ 당시 Source
├─ 고정된 Requirement 정보
└─ predict.py
```

독립 추론:

```powershell
python predict.py --input features.parquet --output scores.parquet
```

---

# 6. 운영 연결 시 체크

Export가 된 뒤에도 바로 운영에 넣지 않는다.

최소 확인:

- [ ] 운영 Candidate Feature 이름이 Training Schema와 같은가
- [ ] Column 순서가 보장되는가
- [ ] Missing 처리 정책이 동일한가
- [ ] 학습에만 존재하는 Target Column을 요구하지 않는가
- [ ] Score 방향이 높은 값 = 높은 순위인가
- [ ] 요청 단위 Candidate Ranking이 일관적인가
- [ ] Latency가 허용 범위인가
- [ ] Model Load 실패 시 Baseline Fallback 정책이 있는가

---

# 7. 추천 운영 연결 형태

현재 구조와 가장 자연스러운 형태:

```text
Routing Worker
    ↓
Candidate Features
    ↓
AI Ranker Adapter
    ├─ Model Load
    ├─ Schema Validate
    ├─ Preprocess
    └─ predict_scores
    ↓
Sort DESC
    ↓
Top 3
```

운영 코드가 실험용 Dataset / Utility를 알아야 할 필요는 없다.

다음: [[07_OPEN_이슈와_다음_작업]]
