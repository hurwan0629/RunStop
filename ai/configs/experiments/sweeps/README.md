# 모델 파라미터 비교 YAML

입력 특성·데이터·분할·평가 설정을 고정하고 모델 파라미터를 비교하는 기존 설정 묶음입니다.
`*_base.yaml`이 모델별 기준값이며 변형은 파라미터 하나를 변경합니다. `use_condition_score: false`를 유지합니다.

각 YAML로 학습하고 결과의 `validation/metrics.json`을 비교합니다.

```powershell
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/sweeps/10_lightgbm_base.yaml
./ai/.venv-win/Scripts/python.exe ai/scripts/train.py --config ai/configs/experiments/sweeps/11_lightgbm_more_trees.yaml
```

Val로 선택한 모델의 결과 폴더를 `ai/scripts/test.py --artifact ...`에 전달합니다. 학습 실행은 Test 지표를 만들지 않습니다.
