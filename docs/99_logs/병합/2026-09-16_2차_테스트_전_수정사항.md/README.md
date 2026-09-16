# 2026-09-16 Git 수정사항 기록

기록 시점의 현재 브랜치: `personal/hurwan`

이 문서는 현재 worktree의 변경사항을 병합/정리 전에 추적하기 위해 작성한 기록입니다.
아직 커밋하지 않은 수정사항 기준이며, 실제 diff의 source of truth는 git worktree입니다.

## 전체 요약

- Backend 로깅 개선
  - 요청 로그에서 `body`, `query`, `params`, `statusCode` 중심으로 출력하도록 정리
  - 응답 `responseBody` 캡처 추가
  - `/health` 로그를 20회 중 1회만 출력하도록 샘플링
  - route recommendation 단계별 로그 추가
- Route naming LLM 입력 확장
  - 거리/경사 중심 입력에서 `featureScores`, `nature`, `facilities`, `surface`, `slopeConstraint`, `weights`, `facilityPreferences`, `prompt`까지 포함
  - worker 응답 `featureValues.surface` 포함
- Routing worker 로그 개선
  - `/routes/recommend` 요청/파싱/추천/응답 로그 추가
  - AI 선택 입력/출력/fallback 로그 추가
  - Python 로그 payload를 pretty JSON 줄내림으로 출력
- AI artifact 및 의존성 변경
  - active artifact를 `sweep_lightgbm_more_trees` 계열로 교체
  - production requirements에 `scikit-learn`, `lightgbm` 추가
  - development requirements 파일 추가
- Mobile place search 수정
  - 검색 결과 중 좌표가 유효하지 않은 항목 필터링
  - 검색 결과 row key를 좌표+이름+주소+index 조합으로 안정화
- Docker/compose 관련 수정
  - 로컬 compose/backend healthcheck 또는 개발 편의 설정 관련 변경 포함

## Git Status 요약

```text
 M backend/src/adapters/llm/prompt.ts
 M backend/src/adapters/llm/types.ts
 M backend/src/app.ts
 M backend/src/logging/logger.ts
 M backend/src/middleware/async-handler.ts
 M backend/src/server.ts
 M backend/src/services/route-recommendation.service.ts
 M docker-compose.yml
 M frontend/mobile/.expo/devices.json
 M frontend/mobile/.expo/types/router.d.ts
 M frontend/mobile/src/features/course/screens/PlaceSearchScreen.tsx
 M routing-worker/Dockerfile
 M routing-worker/requirements.txt
 M routing-worker/src/algo/ai/artifact/manifest.json
 M routing-worker/src/algo/ai/artifact/metrics.json
 M routing-worker/src/algo/ai/artifact/model.pkl
 M routing-worker/src/algo/ai/candidate_selector.py
 M routing-worker/src/algo/pipeline.py
 M routing-worker/src/app.py
 M routing-worker/src/dto/parser.py
?? routing-worker/requirements.development.txt
?? routing-worker/src/algo/ai/artifact/lightgbm_ranker/input_schema.json
?? routing-worker/src/algo/ai/artifact/lightgbm_ranker/manifest.json
?? routing-worker/src/algo/ai/artifact/lightgbm_ranker/metrics.json
?? routing-worker/src/algo/ai/artifact/ranknet/input_schema.json
?? routing-worker/src/algo/ai/artifact/ranknet/manifest.json
?? routing-worker/src/algo/ai/artifact/ranknet/metrics.json
```

## Diff Stat 요약

```text
 backend/src/adapters/llm/prompt.ts                 |  16 +-
 backend/src/adapters/llm/types.ts                  |  32 ++++
 backend/src/app.ts                                 |   4 +-
 backend/src/logging/logger.ts                      |  75 ++++++++-
 backend/src/middleware/async-handler.ts            |  45 ++++--
 backend/src/server.ts                              |   2 +-
 backend/src/services/route-recommendation.service.ts   | 174 ++++++++++++++++++++-
 docker-compose.yml                                 |  19 ++-
 frontend/mobile/.expo/devices.json                 |   2 +-
 frontend/mobile/src/features/course/screens/PlaceSearchScreen.tsx | 22 ++-
 routing-worker/Dockerfile                          |   2 +
 routing-worker/requirements.txt                    | Bin 2314 -> 1118 bytes
 routing-worker/src/algo/ai/artifact/manifest.json  | 164 +++++++++----------
 routing-worker/src/algo/ai/artifact/metrics.json   |  96 ++++++------
 routing-worker/src/algo/ai/artifact/model.pkl      | Bin 749647 -> 1898543 bytes
 routing-worker/src/algo/ai/candidate_selector.py   |  69 +++++++-
 routing-worker/src/algo/pipeline.py                |  10 +-
 routing-worker/src/app.py                          | 124 +++++++++++----
 routing-worker/src/dto/parser.py                   |   3 +-
```

## Backend 상세

### `backend/src/logging/logger.ts`

- `pino-http` request serializer를 커스텀화
  - `req.raw` 기준으로 `body`, `query`, `params`를 읽음
  - headers 전체 출력 제거
- response serializer 축소
  - `statusCode` 중심
- `res.json()` 래핑으로 `responseBody` 캡처
- 민감 응답 필드 redact 경로 추가
  - `responseBody.password`
  - `responseBody.accessToken`
  - `responseBody.refreshToken`
  - 기타 verification code 계열
- `/health` 자동 HTTP 로그 샘플링
  - 20회 중 1회만 출력

### `backend/src/middleware/async-handler.ts`

- controller start/success 로그에서 `/health`만 20회 중 1회 출력
- error 로그는 샘플링하지 않고 유지

### `backend/src/app.ts`

- `express.json()` 이후 request logger가 동작하도록 순서 조정
  - request body 로깅을 위해 필요

### `backend/src/services/route-recommendation.service.ts`

- `recommendRoutes()` 단계별 로그 추가
  - `service:llm_condition_parse:start`
  - `service:llm_condition_parse:skip`
  - `service:llm_condition_parse:success`
  - `service:worker_request:start`
  - `service:worker_response:received`
  - `service:worker_request:success`
  - `service:route_name_generation:start`
  - `service:route_name_generation:success`
  - `service:database_save:success`
- worker fallback 시도별 로그 필드 추가
  - `attemptNumber`
  - `attemptCount`
  - `requestedMaxSlope`
  - `appliedMaxSlope`
  - `responseCandidateCount`
  - `addedCandidateCount`
  - `durationMs`
- 추천 경로명 생성 LLM 입력 확장
  - 기존: 거리, 경사, 야간, verified landmarks 중심
  - 추가: `featureScores`, `nature`, `facilities`, `surface`, `slopeConstraint`, `weights`, `facilityPreferences`, `prompt`

### `backend/src/adapters/llm/types.ts`

- `RouteNamingCandidateInput` 확장
  - `featureScores`
  - `nature`
  - `facilities`
  - `surface`
  - `slopeConstraint`
- `RouteNamingInput` 확장
  - `prompt`
  - `weights`
  - `facilityPreferences`

### `backend/src/adapters/llm/prompt.ts`

- route naming prompt 관련 수정사항 있음
- 실제 반영 내용은 diff 확인 필요

### `backend/src/server.ts`

- 서버 listen 설정 관련 수정사항 있음
- 외부 네트워크 접근을 위해 `0.0.0.0` 바인딩 관련 변경 가능성이 있음

## Routing Worker 상세

### `routing-worker/src/app.py`

- 공통 `log(level, message, data)` 추가
  - 출력 형태: `[시간] [레벨] 내용`
  - payload는 `json.dumps(..., indent=2, ensure_ascii=False)`로 줄내림 출력
- `/routes/recommend` 단계별 로그 추가
  - `routes/recommend:start`
  - `routes/recommend:parsed`
  - `routes/recommend:recommended`
  - `routes/recommend:response`
- 기존 전체 `cands` 출력 제거
  - 후보 요약만 출력
  - distance, score, point count, failed conditions 중심
- 요청별 `request_id` 생성 후 pipeline/AI 선택까지 전달

### `routing-worker/src/algo/pipeline.py`

- `recommend()` 인자에 `request_id` 추가
- `select_candidates_with_ai()` 호출 시 `request_id` 전달

### `routing-worker/src/algo/ai/candidate_selector.py`

- AI 선택 로그 추가
  - `ai/select:input`
  - `ai/select:output`
  - `ai/select:fallback`
- artifact ranking 성공 시 점수 범위와 선택 후보 요약 출력
- fallback 시 condition score 기반 선택 결과 출력
- payload 줄내림 JSON 출력

### `routing-worker/src/dto/parser.py`

- worker 내부에서 계산한 `surface`를 backend 응답의 `featureValues.surface`에 포함

### `routing-worker/src/algo/ai/artifact/*`

- active artifact 파일 교체
  - `model.pkl`
  - `input_schema.json`
  - `manifest.json`
  - `metrics.json`
- 현재 manifest 기준:
  - `name`: `sweep_lightgbm_more_trees`
  - `model`: `lightgbm_ranker`
- `model.pkl` 크기 변화:
  - 기존 약 749 KB
  - 변경 후 약 1.9 MB

### `routing-worker/requirements.txt`

- production용 runtime dependency 추가
  - `scikit-learn`
  - `lightgbm`

### `routing-worker/requirements.development.txt`

- 새 파일
- 로컬 개발/실험용 무거운 dependency 분리

```text
-r requirements.txt

xgboost
catboost
torch
```

## Mobile 상세

### `frontend/mobile/src/features/course/screens/PlaceSearchScreen.tsx`

- 장소 검색 결과 중 좌표가 유효하지 않은 항목 필터링
- 검색 결과 row key를 안정화
  - 기존: `latitude:longitude`
  - 변경: `latitude + longitude + name + address + index`
- React Native list key 충돌/invalid coordinate 방지 목적

## Docker/Compose 상세

### `docker-compose.yml`

- 로컬 compose 설정 변경사항 있음
- caddy/backend healthcheck 또는 depends_on 관련 조정 가능성이 있음

### `routing-worker/Dockerfile`

- dependency 설치 파일 관련 변경사항 있음
- production에서는 `requirements.txt`만 사용해야 함
- `requirements.development.txt`는 AWS production image에 포함/설치하지 않는 방향

## 현재 확인한 검증

아래 검증은 대화 중 수행됨.

```text
backend: npm run build 통과
routing-worker: python -m compileall routing-worker\src 통과
routing-worker selected files: compileall 통과
frontend/mobile: npm run lint 통과
```

남은 lint warning:

```text
frontend/mobile/src/features/course/context/CourseDraftContext.tsx
frontend/mobile/src/features/course/screens/CourseCompareScreen.tsx
frontend/mobile/src/features/course/screens/PlaceSearchScreen.tsx
frontend/mobile/src/features/running/screens/ActiveRunningScreen.tsx
```

모두 warning이며 error는 없었음.

## 병합 전 주의사항

- `.expo` 아래 파일 변경은 개발환경 산출물일 수 있으므로 커밋 포함 여부 확인 필요
  - `frontend/mobile/.expo/devices.json`
  - `frontend/mobile/.expo/types/router.d.ts`
- `routing-worker/requirements.txt`는 기존 binary diff로 표시됨
  - 인코딩 정리 영향 가능성 있음
- `routing-worker/src/algo/ai/artifact/lightgbm_ranker/`, `ranknet/` 신규 artifact 메타 파일은 의도적으로 포함할지 확인 필요
- production AWS 배포 시 `requirements.development.txt`를 Dockerfile에서 설치하지 않아야 함
- `latest` 태그 이미지는 AWS에서 `docker compose pull` 또는 `up -d --pull always`가 필요함

