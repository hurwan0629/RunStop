# 사용자 조건을 반영하는 후보 생성과 추천 결과 검증

작성일: 2026-09-19. 수정 기준: `hotfix`, `d08cf779aa1efc3469766226a724603e634680a5`.
작업 시작 시 Git 작업 트리는 깨끗했다. 아래 결과는 이 문서와 함께 있는 작업 트리 기준이며 배포 완료를 뜻하지 않는다.

## 확인된 원인

- `facilityPreferences`는 worker `recommend()`까지 도착했지만 후보 생성 함수에는 전달되지 않았다.
- 자연환경 탐색 비용은 OSM 태그만 참조했고, 별도 공원·하천 geometry는 생성 후 feature 계산에 쓰였다.
- 실제 서울 그래프는 노드 164,891개, edge 472,440개이며 `grade`/`grade_abs`가 있는 edge는 0개였다. 최대 경사와 경사 비용이 탐색 단계에서 작동할 데이터가 없었다.
- 편도 방향 후보는 6개, 일반 방향 후보는 기본 12개였다. `pool=8` 인자는 실제 제한에 사용되지 않았다.
- 정상 시 Top 3는 AI artifact 점수로 선택했다. 응답의 `score`는 heuristic `condition_score`였고 AI 점수는 저장하지 않았다.
- CCTV feature와 AI 입력 컬럼은 이미 있었다. 지도용 야간 시설 목록에서 CCTV가 빠지고 보행등이 들어가 있었다.
- 실제 CSV 유형별 행 수: 보안등 179,806 / CCTV 59,750 / 가로등 19,355 / 편의점 9,543 / 화장실 5,492 / 도시공원 1,786 / 보행자전용도로 96. 보행등은 없다. 시설 분석 시에는 좌표가 없는 행을 제외한다.
- `CourseMap.tsx`의 실제 GPS 경로와 선택 구간 overlay가 `NaverMapView` 바깥에 있었다.

## 변경 흐름

```text
Mobile: 거리 / 경사 / 환경 / 시설 / 야간
  → Node 입력 검증 및 선택 해석
  → FastAPI 기존 요청 + optional slopePreference
  → DEM 탐색 경사 준비(그래프당 한 번)
  → 요청 주변 도로·시설·자연 geometry 조회
  → 기존 방향 후보 + 조건에 맞는 내부 기준점을 지나는 후보
  → 거리·중복 필터 및 유사 경로 제거
  → 기존 DEM 경사 분석 및 요청 최대 경사 재확인
  → 기존 시설·자연·도로 feature와 heuristic score
  → 동일 75개 입력 컬럼의 AI artifact → Top 3
  → Node 기존 경사 완화/중복 제거 → 최대 3개 DB 저장
  → 관리자 비교 / 사용자 선택 / 러닝 기록에서 기존 관계로 재조회
```

### 입력과 경사 의미

새 UI는 목표 거리, **완만 / 약간 경사짐 / 상관없음**, 공원·하천 선호, 신호등·횡단보도 적게, 화장실·편의점, 야간 중요도 1~5만 제공한다. 거리·경사 중요도와 overlap 조절 UI는 없다.

기존 `NORMAL` 식별자는 호환성을 위해 유지하되 표시와 의미는 **약간 경사짐**으로 바뀐다. 과거 요청에는 이 필드가 없으므로 기록 화면에서 과거의 최대 경사를 새 선택으로 단정하지 않는다.

| 입력 | Node/worker 해석 |
|---|---|
| 목표 거리 | 기존 미터 단위 `targetDistance`; 새 UI의 distance weight는 내부 상수 3 |
| GENTLE | 최대 경사 5%, 낮은 경사 탐색 비용 우선, elevation weight 5 |
| NORMAL | 최대 경사 8%, 탐색 시 절대 경사 5%에 가까운 구간을 선호, elevation weight 5 |
| ANY | 최대 경사 미지정, elevation weight 0 |
| 자연환경 OFF / ON | `nature`와 `park` 모두 0 / 5. `requirements.park` 필수조건으로 바꾸지 않음 |
| Flow OFF / ON | `flow` 0 / 5 |
| 시설 OFF / ON | 기존 `IGNORE` / `PREFER` |
| 야간 | 기존 `night` 1~5 |
| overlap | 새 UI 요청에서 제거하고 기존 내부 기본 품질 기준 사용 |

`slopePreference`, `preferNature`, `preferFlow`는 Node elementConditions의 optional 필드다. 입력을 한 번 정규화한 후 worker 요청 검증에서는 다시 UI의 최대 경사로 덮어쓰지 않는다. 그래야 Node의 5→8→미지정 또는 8→12→미지정 완화가 보존된다. 과거 클라이언트의 기존 weights 요청도 지원한다.

**5% 탐색 목표는 경로 평균 5%를 보장하는 수치가 아니다.** 기존 `EDGE_SLOPE_GOOD_PCT=2`를 사용한 초기 구현과 5를 비교했고, 이 표본에서 실제 추천의 경사 차이가 더 분명한 5를 선택했다. `ROLLING_TARGET_SLOPE_PCT`는 `config.py` 한 곳에 있다. 재학습이나 새 AI 컬럼 없이 후보 생성과 heuristic 경사 점수에만 이 의미를 적용한다.

원본 GraphML과 DEM 파일은 변경하지 않는다. `prepare_graph_elevation()`이 DEM의 노드 고도차로 `routing_slope_pct`를 메모리에 준비한다. 기존 grade가 있으면 보존한다. 짧은 도로의 DEM 격자 오차가 증폭되지 않도록 분모에는 기존 30m 샘플 간격을 하한으로 쓴다. 이후 기존 전체 경로 DEM 분석의 최대 경사로 다시 검사한다. DEM 정보가 없으면 평지로 간주하지 않으며 응답의 `slopeConstraint.evaluation`에 `UNAVAILABLE`을 표시한다.

경사는 DEM 추정치다. 실제 도로의 계단·고가·터널·세밀한 굴곡을 정확히 재현한다고 볼 수 없다. 엄격한 조건에서 후보가 부족하면 Node의 기존 완화가 작동하며 `RELAXED`로 표시한다. 코스 비교와 기록 상세에서 대안임을 안내한다.

### 후보 생성

`routing/guidance.py`는 기존 시설 좌표 캐시, 자연 geometry 캐시, `NodeIndex`의 KD-tree를 재사용한다. 새 데이터셋·DB 테이블·공간 라이브러리를 추가하지 않는다.

1. 목표 거리로 도달 가능한 범위의 도로 노드를 구하고 출발·사용자 경유지·도착지 사이 직선거리 하한으로 범위를 줄인다.
2. 선택 시설의 기존 50m 버퍼 안 도로 노드에 시설 밀도를 반영한다. 야간은 CCTV·보안등·가로등을 사용하며 중요도가 높을수록 기준점 점수에 더 반영한다.
3. 자연환경 ON은 기존 공원·하천 geometry의 50m 이내 도로 노드를 사용한다. 같은 도로 노드 집합을 edge 비용에도 연결한다. OSM 태그만 보는 기존 방식의 한계를 보완한다.
4. 약간 경사짐은 적당한 경사가 있는 도로 노드도 기준점 후보로 사용한다.
5. 한 밀집 지역에 몰리지 않도록 방향별로 기준점을 고른다. 실제 시설 출입구 접근 여부를 검증하는 기능은 아니다.
6. `generate_course_via()`와 기존 Dijkstra·거리 보정을 그대로 사용한다. 자동 기준점은 사용자 경유지 목록 뒤에 추가하지만, 최종 후보의 원래 route mode와 실제 `user_via_count`를 보존한다. 왕복은 기존 역순 복귀를 유지한다.
7. guided 후보와 방향 후보를 합쳐 기존 거리·중복 기준을 적용한다. 유사 경로에서는 guided 후보를 먼저 남겨 요청 반영 경로가 먼저 사라지지 않게 한다.

`pool`은 이제 **추가 guided 시도 상한**이다. 전체 후보를 8개로 잘라 버리지 않는다. 기본 방향 시도 12개(편도 6개)는 그대로이며 추가 시도 상한 8을 적용한다. 4와 8을 실험했고, 8이 화장실과 야간에서 유리하되 모든 지표를 지배하지는 않았다. 현재 선택은 임시 운영값이며 측정 없이 계속 후보 수를 늘리는 정책이 아니다.

Flow 탐색은 기존 신호등·횡단보도 비용을 사용한다. heuristic Flow 점수도 신호등과 횡단보도를 함께 반영하도록 맞췄다. 같은 길 반복 방지는 기존 edge 재사용 penalty, 중복 후보 제거, overlap score로 유지한다.

### AI와 저장 호환성

- AI `model.pkl`, `input_schema.json` 및 75개 입력 컬럼은 변경하지 않는다. 모델 재학습 없음.
- `candidate_nature_park_ratio`와 `candidate_nature_water_ratio`는 각각 그대로 유지한다.
- `walklight`는 내부 feature/AI 호환 필드로 유지한다. CCTV 값을 보행등 필드에 넣지 않는다.
- AI 입력의 경유지 수는 사용자 지정 수만 반영한다. 자동 기준점은 사용자 경유지로 표시하지 않는다.
- artifact 점수가 Top 3를 정한다. 오류 시 heuristic으로 대체한다. `score`의 기존 heuristic 의미는 유지한다.
- 기존 `feature_values` JSON에 `aiScore`, `rankingSource`, `generationSource`, `distanceErrorPct`, `overlapRatio`를 추가한다. 원시 점수나 순위 방식이 없는 과거 기록은 `—`로 표시한다.
- 요청은 기존 `route_requests.element_conditions`, 추천은 `route_recommendations.feature_values`에 저장한다. 최대 3개 저장 정책과 `{requestIdx, recommendations}` 응답은 유지한다.
- 추천 응답의 optional `slopeConstraint`는 실제 적용 최대 경사와 완화 여부를 보여준다.
- LLM 관련 처리는 변경하지 않는다.

## 관리자와 기록 화면

`/running/:sessionIdx`의 기존 관리자 상세 화면에 요청 조건과 후보 A/B/C 표를 추가했다. 거리·거리 오차·평균/최대 경사·누적 상승, 시설 count/per_km, park/water, 신호등/횡단보도, overlap, heuristic/AI 점수, 적용 경사 제한과 선택 후보를 비교한다.

비교할 다른 **요청 번호**를 입력하면 같은 표에 추가한다. 같은 출발지·거리·유형이고 조건 하나만 다른 요청을 비교해야 한다. 추가 조회는 관리자 인증/권한 미들웨어를 사용하는 `GET /api/admin/route-requests/:requestIdx`이며, 러닝을 시작하지 않은 저장 요청도 조회 가능하다. 목록 시스템을 새로 만들지 않았다.

사용자 러닝 상세는 소유권 확인 후 `session → selected recommendation → route request`를 따라 요청 조건과 경로 feature를 읽는다. 요청 출발·도착·경유 좌표는 기존 `route_request_points`에서 조회한다. 러닝 세션에 요청/feature를 중복 저장하지 않는다.

추천 경로·실제 GPS·선택 구간 overlay를 모두 `NaverMapView` 안에 배치했다. GPS `trackPaths`는 각각 표시하고 단절 구간을 연결하지 않는다. 선택한 추천 경로의 지표와 실제 GPS 구간 분석은 화면에서 구분한다.

야간 지도와 문구는 CCTV·보안등·가로등만 사용한다. 실제 경로 버퍼 내 시설만 표시하고 종류별 0개는 범례에서 생략한다. 보행등 데이터 없음 문구는 제거했다. GPS 구간 분석의 기존 캐시는 버전이 포함된 fingerprint로 한 번 갱신한다. 이미 저장된 과거 추천 경로의 CCTV 마커는 자동으로 소급 생성하지 않는다.

## 실험과 결과

원본 결과는 [experiments/](experiments/)에 있다. `preferences-before`는 코드 수정 전 한 출발점의 any/gentle/rolling, `preferences-final`은 최종 세 출발점의 8개 조건이다. 중간 실험 `preferences-after`는 경사 목표 2 및 초기 자연환경 유도 구현이고, `preferences-rolling5`는 목표 5와 실제 자연 도로 비용 연결 후의 실험이다. `preferences-budget4`는 추가 시도 상한 4 비교다.

출발점은 동대문 `(37.571806,127.011287)`, 잠실 인근 `(37.5133,127.0590)`, 회현 인근 `(37.5563,126.9723)`. 목표 3km, LOOP. baseline은 시설 IGNORE, 자연환경/Flow OFF, 야간 1, 경사 ANY다. 다른 조건은 하나씩 변경한다. 경사 비교는 GENTLE과 NORMAL을 직접 비교한다.

아래는 **각 단계 후보의 산술평균**이다. 전체 후보 수가 출발점마다 다르므로, 최종 summary JSON에는 `origin_means`와 출발점별 평균에 동일 가중치를 준 `mean_of_origin_means`도 별도로 제공한다. 평균·중앙값·최소·최대와 원시 CSV를 함께 확인한다.

| 지표 | 전체 pool OFF/기준 → ON | AI Top 3 OFF/기준 → ON |
|---|---:|---:|
| 공원 인접률 | 5.8% → 6.1% | 4.6% → 7.9% |
| 하천 인접률 | 0.4% → 0.8% | 0.6% → 0.5% |
| 신호등 /km | 0.307 → 0.240 | 0.217 → 0.112 |
| 횡단보도 /km | 3.939 → 3.143 | 2.777 → 2.418 |
| 화장실 /km | 2.177 → 2.495 | 2.520 → 2.994 |
| 편의점 /km | 4.028 → 4.223 | 4.581 → 4.847 |
| 야간 종합 점수¹ | 53.89 → 55.28 | 49.83 → 61.26 |
| 평균 경사: 완만 → 약간 경사짐 | 0.716% → 1.420% | 0.725% → 1.230% |

¹ 실험용 야간 종합 점수는 기존 streetlight/cctv 소점수의 평균이다. AI 입력 컬럼을 추가하지 않는다. AI Top 3의 CCTV /km는 9.08→11.49, 보안등은 49.59→61.19, 가로등은 0→0.446이었다.

경사 선택별 AI 추천의 평균 경사(출발점별):

| 출발점 | 완만 | 약간 경사짐 |
|---|---:|---:|
| 동대문 | 0.560% | 0.753% |
| 잠실 인근 | 0.885% | 1.403% |
| 회현 인근 | 0.783% | 1.533% |

수정 전 한 출발점에서는 세 경사 선택의 pool과 Top 3가 같았다. 최종 실험의 완만 후보 최대 경사는 4.75%, 약간 경사짐은 8% 이하였다. 잠실 완만은 엄격한 조건에서 후보 2개만 반환했다. 표는 **worker의 엄격한 첫 시도**이며 Node가 완화해서 추가한 세 번째 코스를 섞지 않는다. UI에서는 완화 여부를 확인해야 한다.

경사 탐색 목표 2→5 비교에서 AI 추천 평균 경사는 0.917%→1.230%로 증가했다(최종 경사 재검증 전 실험). 추가 후보 상한 4→8에서는 화장실 /km 2.628→2.994, 야간 점수 59.78→61.26, 편의점 /km 4.996→4.847로 모두 같은 방향은 아니었다. 이런 trade-off를 근거로 8을 유지했다.

거리 중요도를 제거하되 내부 weight 3은 유지했다. 같은 동대문 ANY의 pool 거리 오차 평균 2.818%, AI Top 3 2.6%는 수정 전후 동일했다. 최종 24개 조건 실행의 후보 거리 오차는 모두 기존 10% 이내, LOOP 중복률은 최대 0.175였다. 실행 시간은 조건별 약 0.79~5.62초, 중앙값 약 3.01초였고 첫 실행은 DEM/feature/model 로드 비용을 포함한다. 부하·동시 요청·최대 메모리는 별도 검증이 필요하다.

편도와 왕복은 동대문 출발 + 사용자 경유지 `(37.571806,127.015)`로 추가 확인했다. `preferences-one-way`, `preferences-round-trip`에 기록했다. 편도 완만은 첫 시도 2개, 나머지 실행은 Top 3였다.

**모든 최종 실험은 기존 artifact로 순위를 계산했다.** 그러나 자연환경의 전체 pool 하천 인접률 개선이 AI Top 3에는 유지되지 않았다. 현재 자연환경은 공원·하천을 묶은 선택이므로 둘 다 항상 증가한다고 보장하지 않는다. 하천 후보의 순위가 지속해서 밀리면 여러 시작점/거리에서 분포를 더 확인한 뒤 재학습 여부를 결정한다. 이번 작업에서는 재학습하지 않았다.

사용자가 실제 선택한 후보는 이 실험에서 만들어 내지 않는다. `user_selected`는 기본 false이며 실제 선택 자료를 제공한 경우만 채운다. 운영에서는 기존 DB의 선택된 추천과 관리자 표를 통해 확인한다.

### 재현 명령

`routing-worker/`에서 기존 가상환경의 Python으로 실행한다.

```powershell
.\.venv\Scripts\python.exe scripts/compare_preferences.py --output ../docs/experiments/check --origins 3
.\.venv\Scripts\python.exe scripts/compare_preferences.py --output ../docs/experiments/budget4 --guided-budget 4
.\.venv\Scripts\python.exe scripts/compare_preferences.py --output ../docs/experiments/slope2 --variants gentle,rolling --rolling-target 2
.\.venv\Scripts\python.exe scripts/compare_preferences.py --output ../docs/experiments/one-way --origins 1 --route-type ONE_WAY --via 37.571806 127.015
.\.venv\Scripts\python.exe scripts/compare_preferences.py --output ../docs/experiments/check --summarize-only
```

결과 `.json`은 요청별 전체 pool, `.csv`는 후보별 지표 및 `top3`/`user_selected`, `.summary.json`은 단계별 분포다. 후속 실행에는 wall/CPU 시간과 guided budget/경사 목표도 기록한다. `--selected`는 `{ "case_id": "candidate_id" }` JSON을 받아 실제 선택을 표시한다. 실험 중 연결되는 Node/DB 쓰기는 없다.

`--guided-budget 0`은 guided 기준점과 그 준비 과정의 geometry 연결을 끄는 비교용 옵션이다. worker 공개 요청에는 실험용 조절 인자를 추가하지 않았다. 기존 수정 전 실행을 다시 만들려면 해당 기준 commit의 격리된 checkout에서 스크립트의 당시 버전을 사용해야 한다.

## 검증·배포

최종 자동 검사: Worker 13개, Node 18개, 모바일 지도/오류 회귀 3개 통과. Node·Admin 빌드와 모바일 TypeScript 검사 통과. 관리자 수정 파일 ESLint 통과.

- Worker unit/integration: 경사 탐색 구분, DEM 캐시/부재, 시설 조건 전달, 유도 후보 변화, 사용자 경유지와 왕복 보존, Flow/자연 도로 비용, 최대 경사 재검증, AI/fallback 점수 기록, 시설 마커 집계, 지도 레이어 및 편도 회귀.
- Node: 새 조건 정규화, OFF=0 유지, 과거 입력, 경사 완화 값 전달, 시설 타입, 요청/feature 조회, 소유권 거절, GPS 단절 및 환경 분석 캐시.
- Mobile: TypeScript 검사, 네이버 지도 overlay가 native map 안에 있는지 AST 회귀 검사, 기존 추천 오류 처리 검사.
- Admin: 프로덕션 빌드와 수정 파일 ESLint.

```text
routing-worker: python -m unittest discover -s tests -v
backend: npm test -- --run / npm run build
frontend/mobile: npx tsc --noEmit -p .
frontend/mobile: node --experimental-strip-types --test tests/recommendation-errors.test.mjs tests/course-map.test.mjs
frontend/admin: npm run build
```

DB migration은 필요 없다. 새 Node는 optional JSON 값과 CCTV 타입을 수용하므로 Node를 먼저 갱신한 뒤 worker와 모바일/관리자 앱을 함께 갱신한다. 옛 Node의 시설 enum은 CCTV를 거절할 수 있어 새 worker만 먼저 배포하지 않는다. 과거 클라이언트의 지도 표시도 함께 점검한다.

기존 AI 입력 계약, 추천 저장 개수, 선택 관계, API 핵심 응답은 유지한다. 실제 휴대폰에서의 지도 렌더링 및 운영 DB를 통한 관리자 비교 클릭은 자동 검사와 별도로 확인해야 한다. 이 작업 중 운영 추천/러닝 데이터를 추가하거나 수정하지 않았다.
