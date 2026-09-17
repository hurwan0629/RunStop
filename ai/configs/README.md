# YAML 설정

기존 `schema_version: 1` YAML을 그대로 사용합니다. 설정 파일을 직접 편집합니다.

- `generation/`: `generate_dataset.py --config ...`로 데이터 생성
- `experiments/`: `train.py --config ...`로 Train 학습·Val 평가
- 테스트: `test.py --artifact ...`로 학습 당시 저장된 YAML과 모델·분할표 사용

YAML 안의 상대 데이터·출력 경로는 `ai/` 기준입니다. CLI의 `--config`, `--artifact`는 현재 실행 디렉터리 기준입니다.

```powershell
python ai/scripts/train.py --config ai/configs/experiments/03_lightgbm_ranker.yaml --validate-only
python ai/scripts/generate_dataset.py --config ai/configs/generation/synthetic_v001.yaml --check
```

모델 파라미터 기본값과 범위는 `src/config/schema.py`에서 검증합니다. 분할은 `user_temporal_holdout`을 유지하며 `test_requests`는 학습에서 제외할 Warm Test 요청 수입니다.
