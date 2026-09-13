# RunStop AI · Experiment Studio

경로 후보를 재정렬하는 오프라인 실험 환경입니다. HTML에서 YAML 설정을 만들고, **데이터 생성과 학습은 별도 CLI로 실행**합니다. 웹 서버에는 생성·학습 실행 API가 없습니다. 운영 `routing-worker/`는 수정하지 않습니다.

## 시작하기

아래 명령은 **RunStop 저장소 루트**에서 실행합니다. Windows CPython 3.12 이상을 사용하세요. MSYS Python은 지리/ML 패키지 wheel 호환성이 다릅니다.

```powershell
# 새 환경을 만들 때 (현재 작업 공간에는 ai/.venv-win 준비됨)
py -3.12 -m venv ai/.venv-win
./ai/.venv-win/Scripts/python.exe -m pip install -r ai/requirements.txt

# 사용할 모델만 설치 가능
./ai/.venv-win/Scripts/python.exe -m pip install lightgbm
# 모델 7종을 모두 사용하려면: -r ai/requirements-models.txt

# HTML 설정 편집기
./ai/.venv-win/Scripts/python.exe ai/scripts/config_ui.py
```

브라우저에서 **http://127.0.0.1:8765**에 접속합니다. 종료는 터미널에서 Ctrl+C입니다. macOS/Linux에서는 가상환경 Python 경로를 `ai/.venv/bin/python`으로 바꾸면 됩니다.

화면은 모델별 파라미터, 입력 특성, 데이터 분할, 평가 설정, 생성 설정, Utility를 제공합니다. YAML 검증·미리보기·저장·다운로드·가져오기를 지원합니다. 같은 파일명은 덮어쓰지 않습니다. 화면의 실행 명령은 서버를 실행한 Python 경로를 사용합니다.

## 현재 지원 범위

| 항목 | 구현 |
|---|---|
| 입력 JSON | snake_case 및 Node DTO camelCase, 사용자 1,000명·요청 5,000건 기본값 |
| 후보 | 최소 6 / 목표 8 / 최대 10, 부족 시 추가 방향 탐색 후 제외 또는 오류 |
| Utility | `preference_v1`: 원본 특성 기반 합성 선호, dense 정답 순위, 고정 폭 relevance |
| 분할 | **`user_temporal_holdout` 1종**: Cold 사용자 20%, Known 사용자 마지막 1건 검증·마지막 1건 평가, 나머지 학습 |
| 이력 | 실제 선택 기록이 없어 **비활성화**, 입력 배열 순서를 요청 순서로 가정 |
| 모델 | condition_score / pairwise Logistic Regression / Random Forest 회귀 / LightGBM / XGBoost / CatBoost / RankNet |
| 평가 | NDCG@K, 최상 Utility Top1 적중, Utility regret, 동점 제외 후보 쌍 정확도 |
| 결과 | 모델·전처리·입력 규격·실제 분할·예측·지표·자원·소스 스냅샷·설정·데이터 해시 |

사용자당 유효 요청이 5개면 3/1/1로 나뉩니다. 최소 학습 1건 + 검증 1건 + 평가 1건보다 적은 Known 사용자는 `excluded`로 기록합니다. Cold 사용자는 학습/검증에 등장하지 않습니다. UI에서 미구현 분할 방식을 선택할 수 없습니다.

## 템플릿 생성 (선택 사항)

```powershell
./ai/.venv-win/Scripts/python.exe ai/scripts/create_config.py --model xgboost_ranker --output ai/configs/experiments/xgboost_v001.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/create_config.py --kind generation --output ai/configs/generation/custom_v001.yaml
```

모델 이름과 지원 파라미터는 `src/config/schema.py`, 모델 구현 등록은 `src/models/registry.py`가 관리합니다. 라이브러리의 모든 옵션을 무제한 전달하지 않고, 검증된 파라미터만 허용합니다. 기본값까지 채운 YAML을 저장합니다.

## 데이터 생성 — 나중에 직접 실행

**기존 JSON과 원본 생성기 `datasets/generate_runstop_synthetic_users.py`는 변경하거나 실행하지 않습니다.** 원본 생성기는 독립 자료이며 이 파이프라인의 진입점이 아닙니다.

```powershell
# JSON 검증·필요 파일 존재 여부 확인만. 공간 데이터 로드/생성 없음.
./ai/.venv-win/Scripts/python.exe ai/scripts/generate_dataset.py --config ai/configs/generation/synthetic_v001.yaml --check

# 실제 생성 시에만 워커 환경에 설치
./ai/.venv-win/Scripts/python.exe -m pip install -r ai/requirements-routing.txt

# 이 명령은 실제 recommend()를 호출합니다. 충분한 시간과 공간 데이터가 필요합니다.
./ai/.venv-win/Scripts/python.exe ai/scripts/generate_dataset.py --config ai/configs/generation/synthetic_v001.yaml
```

모든 YAML 상대 경로는 **YAML 위치나 현재 디렉터리와 무관하게 `ai/` 기준**입니다. 명령줄 `--config` 자체는 현재 디렉터리 기준입니다. 기본 공간 데이터 위치는 `../routing-worker/src/algo/data`입니다. 다른 Python을 쓸 때는 `worker_python`에 실행 파일 절대 경로를 입력합니다.

실제 그래프·DEM·시설·공원/하천 파일이 없으면 생성 전에 중단하며 격자 그래프로 대체하지 않습니다. `src` 이름 충돌은 별도 워커 프로세스로 해결합니다. 기존 고도 모듈의 고정 import는 **격리된 프로세스 안에서만** 실제 데이터 위치에 매핑합니다. 그래프는 각 프로세스에서 한 번 읽으며 원본 옆에 캐시를 쓰지 않습니다.

목표 미달 시 방향 수를 늘려 재시도합니다. 6~10개는 그대로 유지하고, 10개 초과는 seed와 request ID를 기준으로 무작위 축소합니다. 원본 점수에 따른 사전 Top10 절단은 하지 않지만, 기존 경로 생성 자체의 선호 반영은 유지됩니다. 실패/제외 요청은 `failures.json`, 시도 횟수는 metadata에 기록합니다. 이미 존재하는 출력 디렉터리는 거부합니다.

## 학습·비교·내보내기 — 나중에 직접 실행

```powershell
# 설정 검증만
./ai/.venv-win/Scripts/python.exe ai/scripts/run_experiment.py --config ai/configs/experiments/lightgbm_compare.yaml --validate-only

# 생성된 데이터셋이 준비되면 학습·평가
./ai/.venv-win/Scripts/python.exe ai/scripts/run_experiment.py --config ai/configs/experiments/lightgbm_compare.yaml

# 완료된 실험끼리 비교 (실제 폴더명으로 변경)
./ai/.venv-win/Scripts/python.exe ai/scripts/compare_models.py ai/artifacts/RUN_A ai/artifacts/RUN_B

# 독립 추론 번들 내보내기
./ai/.venv-win/Scripts/python.exe ai/scripts/export_model.py --artifact ai/artifacts/RUN_A --output ai/artifacts/export_v001
# 내보낸 디렉터리에서: python predict.py --input features.parquet --output scores.parquet
```

비교 명령은 데이터/메타데이터 해시, 실제 분할, 평가 설정이 다르면 비교를 거부합니다. Utility를 바꾸면 데이터를 새 버전으로 생성해야 합니다. 실험 단계는 정답을 재계산하지 않습니다.

모델은 후보마다 점수 하나를 입력 행 순서대로 반환합니다. 높은 점수부터 정렬하며 모델 점수는 확률이 아닙니다. Utility·정답 순위·relevance·식별자는 입력 특성에서 제외합니다. 전처리는 Train에만 fit하고 모델과 함께 저장합니다.

## 검증

```powershell
./ai/.venv-win/Scripts/python.exe -m pip install -r ai/requirements-dev.txt
./ai/.venv-win/Scripts/python.exe -m pytest ai/tests -q
# Windows의 설치된 Edge를 headless로 사용. 테스트 설정은 임시 폴더에만 저장.
./ai/.venv-win/Scripts/python.exe ai/scripts/check_ui.py
```

테스트는 작은 가상 후보 및 임시 Parquet으로 수행합니다. 제공된 5,000건 JSON은 읽기 검증만 합니다. 실제 서울 그래프의 처리량, 메모리, 후보 확보율과 추천 품질은 실제 생성·실험을 실행한 후에 검증해야 합니다.

상세 계약은 [docs/CONTRACTS.md](docs/CONTRACTS.md), Utility 공식은 [docs/UTILITY.md](docs/UTILITY.md), 모델 설정은 [docs/MODELS.md](docs/MODELS.md)를 참고하세요.
