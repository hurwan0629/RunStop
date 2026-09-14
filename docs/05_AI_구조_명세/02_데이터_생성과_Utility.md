# 데이터 생성과 Utility

## 목표

AI가 학습할 수 있도록 한 요청의 여러 후보를 **한 행 = 한 Candidate** 형태로 저장하고, 각 후보에 합성 Utility / Ground Truth Rank / Relevance를 부여한다.

---

# 1. Dataset 기본 단위

Parquet 한 행은 다음 단위다.

```text
1 User
  └─ 1 Request
      ├─ Candidate A → 1 row
      ├─ Candidate B → 1 row
      └─ Candidate C → 1 row
```

핵심 식별자:

| 컬럼 | 의미 |
|---|---|
| `user_id` | 사용자 |
| `request_id` | 데이터셋 전체에서 유일한 요청 |
| `candidate_id` | 해당 요청 안에서 유일한 후보 |
| `request_sequence` | 사용자 안의 요청 순서. 현재 JSON 배열 순서 기반 |

현재 생성 정책은 요청당 후보를 기본적으로 **6~10개** 범위로 유지하는 방향이다.

---

# 2. 주요 Feature 범주

```text
user_weight_*
request_weight_*
request_target_distance_m
request_type_*
request_via_count
requirements_*
candidate_*
```

`candidate_*`에는 대표적으로 다음 정보가 들어간다.

- 거리
- 거리 오차율
- 경로 중복 비율
- 예상 시간
- 조건 충족 여부
- 평균/최대 경사 및 고도
- 시설 개수 / km당 개수 / 최근접 거리
- 공원·하천 등 자연 인접률
- Surface 비율

모델 입력에서 제외되는 대표 항목:

```text
candidate_id
utility
ground_truth_rank
relevance
```

정답을 Feature로 넣어버리는 Data Leakage를 막기 위한 것이다.

---

# 3. Candidate 생성 흐름

```text
Synthetic User
      ↓
Request Sampling
      ↓
기존 Routing Worker recommend()
      ↓
Candidate Raw Features
      ↓
Feature 정규화 / Dataset 조립
      ↓
Utility 계산
      ↓
Parquet + metadata.json
```

현재 원본 `datasets/generate_runstop_synthetic_users.py` 자체는 독립 자료로 유지하며 AI 파이프라인 진입점으로 직접 바꾸지 않는다.

실제 Candidate 생성은 기존 Routing Worker를 격리된 별도 프로세스로 호출한다.

---

# 4. `preference_v1` Utility

Utility는 실제 사용자 로그로 추정한 함수가 아니라 **수정 가능한 초기 선호 가설**이다.

기본 만족도는 모두 `[0,1]` 범위다.

| 항목 | 현재 의미 |
|---|---|
| 거리 | 목표 거리와 가까울수록 높음 |
| 경사 | 평균 경사가 낮을수록 높음 |
| 화장실 / 편의점 | km당 시설이 많을수록 증가 |
| 야간 / 안전 | 가로등·보안등·보행등·CCTV 밀도 기반 |
| 공원 / 자연 | 공원·하천 인접률 기반 |
| 흐름 | 신호등·횡단보도가 적을수록 높음 |
| 보행 환경 | walkable ratio |
| 중복 억제 | `1 - overlap_ratio` |

대표 공식:

```text
distance_satisfaction
= exp(-((actual_distance / target_distance - 1) / tolerance)^2)
```

```text
slope_satisfaction
= exp(-avg_slope_pct / slope_scale_pct)
```

시설은 포화되는 형태로 계산한다.

```text
1 - exp(-density / scale)
```

---

# 5. 사용자 선호와 요청 선호 혼합

항목별 유효 가중치:

```text
effective_weight
= profile_share * profile_weight
+ (1 - profile_share) * request_weight
```

이후 각 Satisfaction의 가중 평균을 만든다.

필수 조건 위반은 별도 Penalty를 적용한 뒤 `[0,1]`로 제한한다.

```text
Utility
= weighted_satisfaction
- violation_count * requirement_violation_penalty
```

> 현재 Requirement는 절대적인 Hard Filter가 아니라 Utility 감점이다.

예를 들어 화장실 필수 조건을 어긴 후보가 다른 만족도에서 매우 높다면 항상 최하위가 된다고 보장하지 않는다.

Hard Constraint 정책이 필요하면 새로운 Utility Version으로 명확히 분리해야 한다.

---

# 6. Ground Truth Rank와 Relevance

Utility가 만들어지면 다음 순서로 정답을 만든다.

1. Utility를 지정 자릿수로 반올림
2. 같은 요청 안에서 높은 Utility부터 **Dense Rank**
3. Utility를 고정 폭 등급으로 변환해 `relevance` 생성

예:

```text
Utility: [0.90, 0.90, 0.50]
Rank:    [1,    1,    2]
```

Relevance는 기본 L=5라면 다음 개념이다.

```text
relevance = min(L-1, floor(Utility * L))
```

따라서 `0.81`과 `0.95`는 Utility 순서는 다르지만 같은 relevance 4가 될 수 있다.

이 차이 때문에:

- NDCG → relevance 사용
- Pairwise Accuracy → Utility 순서 사용
- Utility Regret → Utility 값 자체 사용

으로 서로 보완한다.

---

# 7. 데이터 생성 시 반드시 확인할 것

- [ ] `condition_score`가 Utility 계산에 직접 섞이지 않았는가
- [ ] Utility / Rank / Relevance가 Feature에 포함되지 않았는가
- [ ] 동일 Request의 공통 Feature가 Candidate마다 일관적인가
- [ ] 요청당 후보 수가 정책 범위에 있는가
- [ ] 중복 Candidate / 중복 Request Sequence가 없는가
- [ ] 무한대 값이나 잘못된 문자열 Numeric이 없는가
- [ ] Metadata에 Utility 설정과 Candidate Hash가 기록되는가
- [ ] 생성 실패/제외 요청이 `failures.json` 등에 남는가

---

# 8. 가장 중요한 해석 주의

높은 모델 지표가 곧 실제 사용자 만족도를 증명하지 않는다.

현재 Ground Truth 자체가 합성 규칙이기 때문이다.

따라서 최종적으로는 다음 단계가 필요하다.

```text
Synthetic Utility Validation
        ↓
Human Evaluation
        ↓
실제 선택 로그 수집
        ↓
Utility / Learning Target 재설계
```

다음: [[03_모델_학습과_평가]]
