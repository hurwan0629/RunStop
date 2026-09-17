# OPEN 이슈와 다음 작업

## 목표

현재 `ai/` 구조에서 이미 결정된 것과 아직 실제 검증이 필요한 것을 분리한다.

---

# 1. 현재 결정된 것

- Ranking 문제로 정의한다.
- 기존 `condition_score`는 Baseline으로 유지한다.
- 합성 Utility는 `condition_score`를 정답으로 복제하지 않는다.
- Dataset / Model / Split / Evaluation / Artifact Contract를 분리한다.
- 현재 Split은 `user_temporal_holdout`을 사용한다.
- Warm / Cold를 분리 평가한다.
- 실제 선택 로그가 없으므로 HitRate / MRR을 억지로 만들지 않는다.
- Model Score는 확률이 아니라 Ranking Score 계약이다.
- 실험 결과는 Artifact 단위로 재현 가능하게 저장한다.
- Export는 운영 자동 배포가 아니다.

---

# 2. 가장 큰 OPEN — Utility의 현실성

현재 가장 중요한 질문:

> `preference_v1`이 실제 러너의 선호와 얼마나 닮았는가?

모델 성능이 아무리 높아도 Utility 자체가 현실과 다르면 잘못된 정답을 매우 잘 학습한 것일 수 있다.

다음 검증이 필요하다.

```text
Route Sample
  ↓
사람이 직접 A/B 또는 Ranking 평가
  ↓
Synthetic Utility Ranking과 비교
  ↓
불일치 패턴 분석
```

---

# 3. Candidate Generation 편향

AI는 Routing Worker가 만든 후보만 정렬할 수 있다.

즉 좋은 경로가 Candidate Pool에 아예 없다면 Ranking Model이 해결할 수 없다.

따라서 다음을 별도 평가해야 한다.

- Candidate 확보율
- 후보 다양성
- 서로 지나치게 비슷한 경로 비율
- 거리 조건 만족률
- 경사 / 자연 / 시설 분포 다양성
- Mode별 후보 품질

Ranking 성능과 Candidate Generation 성능을 분리해서 봐야 한다.

---

# 4. Synthetic User 다양성

사용자 1,000명을 만들었다고 자동으로 1,000가지 유효 성향이 생기는 것은 아니다.

확인할 것:

- Weight 분포가 충분히 다양한가
- 특정 Persona가 과도하게 많은가
- Profile Weight와 Request Weight가 사실상 같은 값으로 반복되지 않는가
- Requirement 조합이 현실적인가
- 사용자별 Utility Ranking이 실제로 달라지는가

---

# 5. Split 현실성

현재 `request_sequence`는 실제 Timestamp가 아니라 입력 배열 순서다.

따라서 Temporal Holdout이라는 이름이 실제 시간 순서를 완전히 의미하는 것은 아니다.

실제 로그가 쌓이면:

```text
created_at / selected_at
```

같은 실제 시간 정보를 기준으로 재설계하는 편이 좋다.

---

# 6. 실제 사용자 로그가 생긴 뒤

운영 로그가 충분해지면 Target을 단계적으로 전환할 수 있다.

예:

```text
1단계
Synthetic Utility

2단계
Human Evaluation

3단계
실제 Selected Candidate

4단계
재방문 / 완주 / 이탈 / 만족도 등
```

이때 HitRate@K / MRR / 실제 선택 Accuracy가 의미를 갖기 시작한다.

---

# 7. 모델 실험 우선순위 제안

처음부터 모든 모델의 하이퍼파라미터를 깊게 튜닝하기보다 다음 순서가 합리적이다.

```text
1. condition_score Baseline
2. Logistic Pairwise
3. Random Forest
4. LightGBM Ranker
5. XGBoost / CatBoost
6. RankNet
```

이유:

- 먼저 단순 모델로 Dataset / Target 문제를 발견하기 쉽다.
- Tree Ranker가 강하면 복잡한 Neural Model이 꼭 필요하지 않을 수 있다.
- RankNet은 학습 비용과 튜닝 변수가 더 크다.

---

# 8. 다음 실행 작업

## A. 코드 안정성

- [ ] `pytest ai/tests -q`
- [ ] `check_ui.py`
- [ ] Config Validate

## B. 실제 Generation Smoke Test

- [ ] 10~30 Requests
- [ ] Candidate 6~10 확보 여부
- [ ] 실패 원인 기록
- [ ] 공간 데이터 경로 검증

## C. Baseline Run

- [ ] Dataset 생성
- [ ] Baseline Artifact 생성
- [ ] Warm / Cold Metric 확인

## D. 1차 모델 비교

- [ ] Logistic Regression
- [ ] Random Forest
- [ ] LightGBM
- [ ] 동일 조건 비교

## E. 품질 검증

- [ ] Worst Regret Request 추출
- [ ] Top1 실패 사례 지도 시각화
- [ ] Human Evaluation Sample
- [ ] Utility 규칙 수정 필요성 판단

---

# 9. 완료 기준

AI 테스트 프로젝트를 "모델이 돌아간다" 수준에서 끝내지 않는다.

최소 완료 상태:

```text
실제 Routing Candidate 생성 가능
+ 합성 Dataset 재현 가능
+ Baseline Run 존재
+ 복수 Model 동일 조건 비교 가능
+ Warm / Cold 평가 존재
+ Resource Usage 기록
+ Artifact 재현 가능
+ Export 독립 추론 가능
+ Human Evaluation 계획 존재
```

---

# 마지막 요약

현재 `ai/`의 가장 큰 장점은 모델 구현보다 **실험 조건을 통제하는 틀**을 먼저 만든 점이다.

다음 핵심은 더 많은 모델을 추가하는 것이 아니라:

> **실제 Candidate를 충분히 생성해 보고, `preference_v1`이라는 정답 가설이 현실적으로 의미가 있는지 검증하는 것**이다.

처음으로 돌아가기: [[README]]
