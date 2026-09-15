# Parameter Sweep YAMLs

이 폴더는 입력 feature, dataset, split, evaluation 설정을 고정하고 모델 파라미터만 비교하기 위한 실험 묶음이다.

규칙:

- `00_*_base.yaml`은 모델별 기준값이다.
- 변형 YAML은 기준값에서 파라미터 하나만 바꾼다.
- `features`는 모든 파일에서 동일하게 유지한다.
- `use_condition_score`는 `false`로 유지한다.

실행 예:

```powershell
./ai/.venv-win/Scripts/python.exe ai/scripts/run_experiment.py --config ai/configs/experiments/sweeps/10_lightgbm_base.yaml
```
