# preference_v1 — 정답 순서를 위한 합성 Utility

이 공식은 사용자 선택 로그에서 추정한 함수가 아니라, 수정 가능한 **초기 선호 가설**입니다. 모델은 이 가설에 따른 후보 순서를 학습합니다. 실제 사용자 만족도 검증과 구분합니다. 기존 `condition_score`와 `sub_scores`는 사용하지 않습니다.

## 항목별 만족도

모든 항목은 [0,1]입니다. 측정이 없으면 `missing_satisfaction`(기본 0)을 적용합니다.

| 항목 | 만족도 |
|---|---|
| 거리 | `exp(-((실제거리/목표거리 - 1)/distance_tolerance_ratio)^2)` |
| 경사 | `exp(-평균경사%/slope_scale_pct)` |
| 화장실·편의점 | 각각 `1 - exp(-시설수_per_km/facility_scale_per_km)` |
| 야간·안전 | 가로등·보안등·보행등·CCTV의 /km 합으로 `1-exp(-합/night_scale_per_km)` |
| 공원·자연 | 공원 인접률과 하천 인접률 중 큰 값 |
| 흐름 | `exp(-(신호등_per_km + 횡단보도_per_km)/flow_scale_per_km)` |
| 보행 환경 | walkable_ratio |
| 중복 억제 | `1-overlap_ratio` |

지원 가중치 키는 distance/elevation/toilet/store/night/park/flow/surface/overlap/safety/nature입니다. safety는 night와, nature는 park와 같은 만족도를 사용합니다. 두 키를 동시에 쓰면 각각의 가중치가 더해지므로 서로 독립적인 측정 항목이 아닙니다. 시설 카테고리 중 일부만 측정되면 관측된 야간 시설 밀도 합을 사용합니다.

각 항목의 유효 가중치는 `profile_share * profile_weight + (1-profile_share) * request_weight`입니다. 없는 가중치는 0, 유효 가중치 합은 양수여야 합니다. 만족도의 가중 평균에서 필수조건 위반 개수 × `requirement_violation_penalty`를 빼고 [0,1]로 제한합니다.

필수조건 검사는 원본 특성으로 수행합니다. toilet/store는 개수≥1, park는 공원 인접률>0 또는 공원 시설 개수>0, no_stairs는 계단=0, max_slope_pct는 최대 경사≤요청값입니다. 필요한 측정이 없으면 충족했다고 가정하지 않습니다. `max_slope_pct=0`도 유효한 엄격한 조건입니다.

필수조건은 여기서는 **감점**입니다. 아무 위반 없는 경로가 언제나 위반 경로보다 앞서야 하는 절대 우선순위는 아닙니다. 그런 정책이 필요하면 새로운 Utility 버전에서 명시적으로 설계해야 합니다.

## 정답과 relevance

1. Utility를 `tie_decimals`(기본 8) 자릿수로 반올림합니다.
2. 같은 요청에서 큰 값부터 dense rank를 부여합니다. `[0.9,0.9,0.5] → [1,1,2]`.
3. 고정된 등급 수 L(기본 5)로 `min(L-1, floor(Utility*L))`를 계산합니다.

정답 순위와 relevance는 같지 않습니다. 예를 들어 0.81과 0.95는 Utility 순위가 다르지만 relevance는 둘 다 4입니다. LightGBM/XGBoost/CatBoost는 relevance를, pairwise Logistic/RankNet은 Utility 쌍 선호를, Random Forest는 Utility 값을 학습합니다. NDCG는 relevance를 사용하므로 같은 등급 내 순서에는 보상을 구분하지 않으며, 그 차이는 후보 쌍 정확도와 regret로 확인합니다.

현재 legacy JSON에서 프로필과 요청 가중치가 동일하면 profile_share를 바꿔도 결과가 같습니다. Node DTO 입력의 요청별 가중치는 따로 반영됩니다. Utility는 항상 정답 전용이며 입력 특성으로 넣지 않습니다.

공식 수정은 name/version 또는 데이터 버전에 반영하고 새 스냅샷을 생성하세요. HTML의 Utility 변경은 YAML 편집이며 이미 생성된 Parquet의 정답을 바꾸지 않습니다.
