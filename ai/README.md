# RunStop AI

실행은 **데이터 생성 → 모델 학습·검증 → 저장 모델 테스트** 세 단계입니다.
기존 YAML과 모델 7종을 사용하며, YAML은 직접 편집합니다.

저장소 루트에서 AI 가상환경 Python으로 실행합니다. Windows CPython 3.12 이상을 사용하세요.

```powershell
py -3.12 -m venv ai/.venv-win
./ai/.venv-win/Scripts/python.exe -m pip install -r ai/requirements.txt
# 사용할 모델 라이브러리 설치 (7종 전체)
./ai/.venv-win/Scripts/python.exe -m pip install -r ai/requirements-models.txt
```

## 1. 데이터 생성

기존 생성 동작과 YAML을 그대로 사용합니다. 실제 생성에는 routing 의존성과 공간 데이터가 필요합니다.

```powershell
# 파일 존재 여부·입력 검증만
./ai/.venv-win/Scripts/python.exe ai/scripts/generate_dataset.py --config ai/configs/generation/synthetic_v001.yaml --check

# 데이터 생성
./ai/.venv-win/Scripts/python.exe -m pip install -r ai/requirements-routing.txt
./ai/.venv-win/Scripts/python.exe ai/scripts/generate_dataset.py --config ai/configs/generation/synthetic_v001.yaml
```

생성은 실제 routing-worker를 별도 프로세스로 호출합니다. 원본 사용자 JSON을 수정하지 않으며, 출력 디렉터리가 이미 있으면 중단합니다. 생성 정책과 Utility 계산은 기존과 같습니다.

## 2. 모델 학습·검증

```powershell
# YAML 검증만
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/03_lightgbm_ranker.yaml --validate-only

# Train 학습 + Val 평가 + 모델 저장
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/03_lightgbm_ranker.yaml
```

`kind: experiment` YAML을 그대로 사용합니다. 데이터 로드 → 분할 → 모델 생성 → `fit(train, validation)` → Val 지표 계산 → 저장 순서입니다. 전처리는 Train에만 fit합니다.

기존 `user_temporal_holdout` 분할을 유지합니다. Cold 사용자를 먼저 분리하고, Known 사용자의 마지막 요청은 Warm Test, 직전 요청은 Val, 나머지는 Train으로 배정합니다(각 개수는 YAML 설정). **Test는 예약만 하고 학습 명령에서 예측·평가하지 않습니다.**

모든 모델에 Val NDCG@K, Top1 적중률, Utility regret, pairwise accuracy와 baseline 비교 지표를 만듭니다. 모델 내부 검증 기록은 기존 방식이며, 조기 종료나 자동 최적 모델 선택은 추가하지 않습니다. `condition_score_baseline`은 학습 없이 기존 점수를 평가합니다.

## 3. 저장된 모델 테스트

학습 명령 마지막에 출력된 결과 폴더를 전달합니다.

```powershell
./ai/.venv-win/Scripts/python.exe ai/scripts/test.py --artifact ai/artifacts/학습결과폴더
```

저장된 모델·전처리기, YAML, 실제 분할표를 읽어 Warm/Cold Test만 평가합니다. 재학습하거나 데이터를 다시 분할하지 않습니다. 모델·설정·분할표의 해시와 학습 당시 데이터/metadata 해시를 검사합니다.

기존 통합 실험이 만든 완료된 artifact도 모델·설정·분할표·manifest가 있으면 사용할 수 있습니다. 모델 클래스의 import 경로와 저장 방식은 유지했습니다. 결과는 원본 artifact 옆의 새 `*_test_*` 폴더에 저장하며, 학습 결과와 이전 테스트 결과를 덮어쓰지 않습니다.

## 파일 찾기

```text
ai/
  scripts/
    generate_dataset.py     데이터 생성
    train.py                YAML로 학습·검증
    test.py                 저장된 모델 테스트
    _bootstrap.py           세 명령의 내부 import 경로 설정
  configs/                  기존 generation / experiment YAML
  src/
    config/                 YAML 읽기·검증
    generation/             데이터 생성 (기존 유지)
    dataset/                데이터 로드·특성·분할
    models/                 모델 구현·저장·복원 (기존 유지)
    experiment/
      training.py           Train/Val 실행 순서
      testing.py            저장 모델 Test 실행 순서
      evaluator.py          공통 평가·결과 저장
      metrics.py            랭킹 지표
      artifacts.py          실행 기록·해시·소스 스냅샷
      resources.py          시간·CPU·메모리 측정
      plots.py              평가 그래프
  datasets/                 생성된 데이터
  artifacts/                학습·테스트 결과
  tests/                    코드 검증용 pytest
```

YAML의 상대 데이터·출력 경로는 항상 `ai/` 기준입니다. 명령줄의 `--config`와 `--artifact` 경로는 실행 위치 기준입니다. `output_dir`은 학습 결과의 상위 폴더입니다.

```text
artifacts/
  날짜_train_이름_ID/
    config.yaml
    dataset_reference.json
    split_assignments.parquet
    model/                  model.pkl + input_schema.json
    validation/             metrics.json, predictions.parquet,
                            request_metrics.parquet, plots/
    diagnostics/            학습 기록·특성 중요도·분할 요약
    manifest.json, environment.json, resource_usage.json, run.log
    runtime/                실행 당시 소스
  날짜_test_이름_ID/
    training_reference.json 원본 모델·분할·manifest 참조
    dataset_reference.json
    metrics.json, predictions.parquet, request_metrics.parquet, plots/
    config.yaml, manifest.json, environment.json, resource_usage.json, run.log
    runtime/
```

설정 UI와 기존 통합 실행·일괄 실행·비교·보고서·export·단독 predict 명령은 제거했습니다. 비교할 설정마다 `train.py`를 실행하고 Val 지표로 모델을 선택한 뒤, 선택한 모델을 `test.py`로 평가합니다.

## 코드 검증

```powershell
./ai/.venv-win/Scripts/python.exe -m pip install -r ai/requirements-dev.txt
./ai/.venv-win/Scripts/python.exe -m pytest ai/tests -q
```

작은 가상 데이터로 모델 7종 저장·복원, Train/Val/Test 격리, 데이터 변조 거부, CLI 실행과 기존 데이터 생성 계약을 확인합니다. 실제 경로 생성이나 전체 데이터 학습을 자동 실행하지 않습니다.

상세: [계약](docs/CONTRACTS.md), [모델](docs/MODELS.md), [Utility](docs/UTILITY.md).
