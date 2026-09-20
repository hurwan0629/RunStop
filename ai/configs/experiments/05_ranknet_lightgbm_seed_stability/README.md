# 05_ranknet_lightgbm_seed_stability

## 목적

`04_ranknet_lightgbm_second_round` 결과에서 남은 상위 후보를 **model seed만 변경해 반복 실행**하여, 단일 실행의 우연에 의존한 결과인지 확인한다.

이번 단계에서는 데이터 구성 차이를 섞지 않기 위해 `split.seed=42`를 고정한다. 변경하는 것은 최상위 `seed`뿐이다.

- 기존 `seed=42` 결과는 재사용한다.
- 새로 `seed=7, 21, 84`를 실행한다.
- 후보당 총 4개 seed 결과(`7, 21, 42, 84`)를 비교한다.
- 새 학습 횟수는 총 **12회**이다.
- 모델 선택에는 여전히 Validation만 사용한다.
- Warm/Cold Test는 안정성 후보를 확정한 뒤 실행한다.

## 04 결과에서 선택한 후보

### RankNet

| 후보 | 설정 | seed=42 Validation 결과 | 선정 이유 |
| --- | --- | --- | --- |
| **RN10** | hidden=128, dropout=0.1, lr=0.002, epochs=100 | NDCG 0.997914 / Top1 84.38% / Regret 0.000845 / Pairwise 94.19% | 04에서 RN06 대비 핵심 4지표 모두 개선 |
| **RN06** | hidden=64, dropout=0.1, lr=0.002, epochs=100 | NDCG 0.997701 / Top1 82.00% / Regret 0.001198 / Pairwise 93.84% | 1차 기준점이자 RN10 비교 기준 |

### LightGBM

| 후보 | 설정 | seed=42 Validation 결과 | 선정 이유 |
| --- | --- | --- | --- |
| **LG11** | leaves=7, trees=800, min_child=20, lambda=0.1 | NDCG 0.992131 / Top1 69.44% / Regret 0.003652 / Pairwise 89.06% | Top1/Regret/Pairwise가 강함 |
| **LG12** | leaves=7, trees=800, min_child=20, lambda=1.0 | NDCG 0.992571 / Top1 68.25% / Regret 0.003956 / Pairwise 88.74% | 04 LightGBM 중 NDCG 최고 |

## Seed 설계

| 구분 | 값 | 의미 |
| --- | --- | --- |
| 기존 결과 | 42 | 이미 실행된 결과 재사용 |
| 추가 seed | 7, 21, 84 | 모델 초기화/학습 랜덤성 반복 |
| `split.seed` | **42 고정** | 매 실행에서 Train/Validation/Test 사용자를 동일하게 유지 |
| 데이터/feature | 고정 | seed 외 조건 통제 |

RankNet에서는 `seed`가 PyTorch 초기 가중치와 pair batch shuffle에 직접 영향을 준다.
LightGBM에서는 `seed`가 `random_state`로 전달된다. 현재 설정은 sampling 관련 랜덤성이 크지 않아 seed별 결과가 동일하거나 매우 유사할 수도 있으며, 그 자체가 재현성에 대한 결과다.

> 이 실험은 **모델 랜덤성 안정성**을 보는 단계다. `split.seed`까지 바꾸는 데이터 분할 민감도 실험은 별도로 분리한다.

## 폴더 구조

```text
05_ranknet_lightgbm_seed_stability/
├─ README.md
├─ ranknet/
│  ├─ RN10/
│  │  ├─ RN10_seed_7.yaml
│  │  ├─ RN10_seed_21.yaml
│  │  └─ RN10_seed_84.yaml
│  └─ RN06/
│     ├─ RN06_seed_7.yaml
│     ├─ RN06_seed_21.yaml
│     └─ RN06_seed_84.yaml
└─ lightgbm/
   ├─ LG11/
   │  ├─ LG11_seed_7.yaml
   │  ├─ LG11_seed_21.yaml
   │  └─ LG11_seed_84.yaml
   └─ LG12/
      ├─ LG12_seed_7.yaml
      ├─ LG12_seed_21.yaml
      └─ LG12_seed_84.yaml
```

## 실행

저장소 루트(`ai`의 부모 폴더)에서 PowerShell로 실행한다.

```powershell
$python = ".\ai\.venv-win\Scripts\python.exe"
$train  = ".\ai\scripts\train.py"
$root   = ".\ai\configs\experiments\05_ranknet_lightgbm_seed_stability"

$configs = Get-ChildItem $root -Recurse -Filter *.yaml | Sort-Object FullName

foreach ($config in $configs) {
    Write-Host "실행: $($config.FullName)"
    & $python $train --config $config.FullName
    if ($LASTEXITCODE -ne 0) { throw "실험 실패: $($config.FullName)" }
}
```

## 결과 저장 위치

```text
artifacts/05_ranknet_lightgbm_seed_stability/
├─ ranknet/
│  ├─ RN10/
│  └─ RN06/
└─ lightgbm/
   ├─ LG11/
   └─ LG12/
```

## 비교 방법

후보별로 seed 4개의 평균과 표준편차를 계산한다.

| 후보 | NDCG mean ± std ↑ | Top1 mean ± std ↑ | Regret mean ± std ↓ | Pairwise mean ± std ↑ |
| --- | ---: | ---: | ---: | ---: |
| RN10 |  |  |  |  |
| RN06 |  |  |  |  |
| LG11 |  |  |  |  |
| LG12 |  |  |  |  |

추가로 각 후보에서 `max - min` 범위를 같이 보면 seed에 얼마나 흔들리는지 직관적으로 확인할 수 있다.

## 선정 기준

1. 평균 Validation NDCG@3를 주지표로 본다.
2. NDCG 평균이 비슷하면 Top1, Utility Regret, Pairwise를 함께 본다.
3. 평균 성능이 좋아도 seed 간 표준편차가 크면 안정성이 낮은 후보로 본다.
4. 평균과 안정성이 비슷하면 모델 크기/학습 비용이 작은 후보를 선호한다.
5. 최종 후보를 고른 뒤 Warm/Cold Test를 **한 번만** 실행한다.
6. Test 결과를 본 뒤 다시 하이퍼파라미터를 조정하지 않는다.

## 체크리스트

- [x] 04 결과에서 RankNet 후보 2개 선정: RN10, RN06
- [x] 04 결과에서 LightGBM 후보 2개 선정: LG11, LG12
- [x] split.seed=42 고정
- [x] 추가 model seed 7, 21, 84 YAML 작성
- [ ] YAML validate-only 확인
- [ ] RankNet 6회 실행
- [ ] LightGBM 6회 실행
- [ ] 기존 seed=42 결과와 결합
- [ ] 후보별 mean/std/range 계산
- [ ] 최종 후보 선정
- [ ] Warm/Cold Test 단계로 이동
