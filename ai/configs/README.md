# YAML 설정

`kind: experiment`와 `kind: generation`을 분리하고 `schema_version: 1`을 사용합니다.
모든 상대 데이터·출력 경로는 ai/ 기준입니다. 설정 파일 자체의 위치는 CLI 현재 디렉터리 기준입니다.

- HTML: `python ai/scripts/config_ui.py` (저장/가져오기/검증; 실행 기능 없음)
- 템플릿: `python ai/scripts/create_config.py --model lightgbm_ranker --output ai/configs/experiments/new.yaml`
- 검증: `python ai/scripts/run_experiment.py --config ai/configs/experiments/lightgbm_compare.yaml --validate-only`
- 생성 사전 확인: `python ai/scripts/generate_dataset.py --config ai/configs/generation/synthetic_v001.yaml --check`

현재 분할은 user_temporal_holdout 한 종류입니다. 모델 파라미터 기본값·범위는 src/config/schema.py가 정의합니다. 기존 주석 전용 scaffold YAML과 호환되지 않는 v1 규격이므로 이전 설정은 새 템플릿으로 옮겨야 합니다.
