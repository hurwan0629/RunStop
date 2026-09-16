# Routing Worker 및 AI 병합 정리

## 대상 파일

```text
routing-worker/src/algo/pipeline.py
routing-worker/src/algo/ai/candidate_selector.py
routing-worker/src/algo/features/facilities.py
routing-worker/src/algo/scoring/weighting.py
routing-worker/src/dto/parser.py
routing-worker/src/dto/recommend.py
```

## `pipeline.py`

`recommend()`는 `facility_preferences` 인자를 유지한다.

```python
def recommend(
    G: nx.Graph,
    idx: Any,
    route_type: RouteType,
    start: Coordinate,
    target_km: float,
    end: Coordinate | None = None,
    vias: list[Coordinate] | None = None,
    weights: Weights | None = None,
    requirements: Requirements | None = None,
    facility_preferences: dict[str, str] | None = None,
    n_directions: int = 12,
    top_k: int = 3,
) -> list[CandidateRoute]:
```

### 시설 상태 부착 위치

시설 분석 직후 `facility_status`를 candidate에 부착한다.

```python
c["facilities"] = analyze_nearby_facilities(c["coords"])
c["facility_status"] = get_facility_status(c, facility_preferences)
```

이유:

```text
facility_status는 후보의 feature 값에 가까운 정보다.
selector는 후보 정렬/AI 선택 계층이고, feature 생성 책임을 갖지 않는 편이 역할이 더 일관된다.
```

### scoring 호출

시설 선호는 scoring 단계까지 전달한다.

```python
score_candidate(
    c,
    weights,
    requirements,
    facility_preferences,
)
```

이유:

```text
facilityPreferences는 이미 condition_score 계산에 반영된다.
따라서 selector에서 별도 강제 정렬을 다시 적용하지 않는다.
```

### selector 호출

```python
return select_candidates_with_ai(
    cands,
    weights,
    requirements,
    facility_preferences,
    top_k,
)
```

## `candidate_selector.py`

최종 fallback 정렬은 다음 형태다.

```python
return sorted(
    candidates,
    key=lambda candidate: candidate["condition_score"],
    reverse=True,
)[:top_k]
```

### 제거한 방향

`_candidate_sort_key()` 기반 정렬은 사용하지 않는다.

```text
1순위: 선호 시설 누락 개수
2순위: 선호 시설 총 개수
3순위: condition_score
```

이 방식은 제거했다.

이유:

```text
시설 선호는 scoring에서 condition_score에 이미 반영된다.
selector에서 다시 시설 기준을 최우선으로 두면 시설 선호 영향력이 과도해진다.
현재 selector fallback의 책임은 기존 점수 기반 Top-K 선택이다.
```

### AI 학습 규격 호환 변환

AI 학습 규격은 `facilityPreferences.toilet = PREFER`를 `requirements.toilet = true`와 유사하게 학습했다.

따라서 selector 내부에 AI 호출 경계에서 사용할 변환 함수를 둔다.

```python
def _to_ai_requirements(
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
) -> Requirements:
    ai_requirements = dict(requirements or {})
    preferences = facility_preferences or {}

    if preferences.get("toilet") == "PREFER":
        ai_requirements["toilet"] = True

    if preferences.get("store") == "PREFER":
        ai_requirements["store"] = True

    return ai_requirements
```

현재는 실제 AI 호출이 없으므로 이 helper를 실행하지 않는다.

이유:

```text
변환은 AI 입력 규격 호환을 위한 것이다.
fallback 정렬에서는 변환된 ai_requirements를 사용할 곳이 없으므로 실행하지 않는다.
향후 AI adapter 호출 직전에만 적용한다.
```

## `features/facilities.py`

selector에 있던 시설 상태 계산 helper를 feature 계층으로 이동했다.

```python
FACILITY_STATUS_KEYS = ("toilet", "store")

def get_facility_count(candidate: CandidateRoute, key: str) -> int:
    facilities = candidate.get("facilities") or {}
    value = facilities.get(f"{key}_count", 0)

    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0


def get_facility_status(
    candidate: CandidateRoute,
    facility_preferences: dict[str, str] | None,
) -> dict[str, str]:
    preferences = facility_preferences or {}
    statuses: dict[str, str] = {}

    for key in FACILITY_STATUS_KEYS:
        preference = preferences.get(key, "IGNORE")

        if preference != "PREFER":
            statuses[key] = "IGNORE"
        elif get_facility_count(candidate, key) > 0:
            statuses[key] = "MET"
        else:
            statuses[key] = "RELAXED"

    return statuses
```

이유:

```text
시설 개수와 시설 충족 상태는 facilities feature에서 파생되는 값이다.
candidate_selector.py에 두면 selector가 feature 계산 책임까지 갖게 된다.
features/facilities.py로 이동해서 역할과 책임을 일관되게 관리한다.
```

## `parser.py`

Node/Frontend의 `maxSlope`는 Python parser에서 알고리즘 내부 requirements로 변환한다.

```python
requirements = dict(node_req.elementConditions.requirements)

if node_req.elementConditions.maxSlope is not None:
    requirements["max_slope_pct"] = node_req.elementConditions.maxSlope
```

`facilityPreferences`는 별도 값으로 recommend까지 전달한다.

```python
result["facility_preferences"] = node_req.elementConditions.facilityPreferences
```

이유:

```text
maxSlope는 사용자 요청 계약 필드다.
max_slope_pct는 알고리즘 내부 constraint 이름이다.
둘을 parser에서 변환해 Node/Worker wire DTO와 알고리즘 내부 규격을 분리한다.
```

## `weighting.py`

`facility_preferences`는 `condition_score` 계산에 반영된다.

```text
toilet/store가 IGNORE면 해당 시설 score는 condition_score 계산에서 제외한다.
PREFER일 때만 시설 score가 반영된다.
```

이유:

```text
체크하지 않은 시설이 점수에 영향을 주지 않게 한다.
시설 선호를 selector에서 다시 강제 정렬하지 않아도 condition_score에 자연스럽게 반영된다.
```
