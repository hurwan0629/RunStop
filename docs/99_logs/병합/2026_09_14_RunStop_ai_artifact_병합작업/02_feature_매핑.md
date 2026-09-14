# Feature 매핑 정책

## 기본 원칙

artifact의 `input_schema.json`에 정의된 컬럼을 기준으로 DataFrame을 만든다.

candidate에 있는 값은 그대로 사용하고, 요청 또는 사용자 문맥이 필요한 값은 현재 worker 함수 인자로부터 계산한다.

## request/user weight

현재 `select_candidates_with_ai()` 인자는 사용자 장기 profile을 받지 않는다.

따라서 다음 정책을 사용한다.

```text
user_weight_* = request_weight_*
```

누락된 weight는 학습 기본값과 맞춰 `3`으로 채운다.

`safety`는 요청에 없으면 `night` 값을 사용한다.

`nature`는 요청에 없으면 `park` 값을 사용한다.

## requirements

기존 `requirements`는 그대로 사용한다.

추가로 AI 입력 경계에서만 facility preference를 requirements로 변환한다.

```text
facilityPreferences.toilet = PREFER -> requirements_toilet = 1
facilityPreferences.store = PREFER -> requirements_store = 1
```

이 변환은 AI artifact 입력용이며, routing/scoring 계약 자체를 바꾸지 않는다.

## route type

artifact schema는 다음 one-hot 컬럼을 요구한다.

- `request_type_loop`
- `request_type_one_way`
- `request_type_round_trip`

`CandidateRoute.mode` 기준으로 변환한다.

`mode=via`는 원래 route type 정보가 candidate에 남아 있지 않으므로, 경로의 첫 좌표와 마지막 좌표가 다르면 one-way, 거의 같으면 loop로 취급한다.

이 부분은 `select_candidates_with_ai()` 인자에 route type이 없어서 생기는 최소 추론이다.

## 누락 컬럼

schema에는 있는데 현재 row에 없는 컬럼은 `None`으로 채운다.

학습 artifact의 전처리기는 결측값을 학습 당시 median 기준으로 처리하도록 저장되어 있다.
