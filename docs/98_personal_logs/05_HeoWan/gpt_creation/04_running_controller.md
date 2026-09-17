# RunningController 구현 방향

## 담당 범위

사용자가 실제로 러닝을 시작하고, GPS 기록을 저장하고, 종료 후 기록을 조회하는 흐름을 담당한다.

- 러닝 기록 목록 조회
- 러닝 시작
- GPS 트랙포인트 저장
- 러닝 종료
- 페이스 분석

## 관련 파일

```text
backend/src/routes/running.routes.ts
backend/src/controllers/running.controller.ts
backend/src/services/running.service.ts
backend/src/services/pace-analysis.service.ts
backend/src/repositories/running-sessions.repository.ts
backend/src/repositories/running-trackpoints.repository.ts
backend/src/repositories/route-recommendations.repository.ts
```

## API 명세

### 러닝 기록 목록 조회

`GET /api/running-sessions`

Response:

```json
{
  "success": true,
  "data": {
    "summary": {
      "totalDistance": 183700,
      "totalCount": 24,
      "longestDistance": 12400
    },
    "items": [
      {
        "sessionId": 32,
        "routeId": 501,
        "startedAt": "2026-09-01T15:30:00+09:00",
        "distanceM": 5273,
        "durationSec": 1840,
        "averagePaceSecPerKm": 349,
        "totalAscentM": 34
      }
    ]
  }
}
```

흐름:

```text
authenticate
→ runningService.listRunningHistory
→ runningSessionsRepository.summarizeRunningSessionsByUserIdx
→ runningSessionsRepository.findRunningSessionsByUserIdx
→ route_recommendations JOIN
→ 응답 조립
```

### 러닝 시작

현재 라우터 기준:

`POST /api/running-sessions/start`

기준 문서의 더 RESTful한 후보:

`POST /api/running-sessions`

Request:

```json
{
  "recommendationId": 501
}
```

Response:

```json
{
  "success": true,
  "data": {
    "runningSessionIdx": 32,
    "status": "IN_PROGRESS",
    "startedAt": "2026-09-01T15:30:00+09:00"
  }
}
```

흐름:

```text
authenticate
→ runningStartSchema 검증
→ recommendation 존재 확인
→ 현재 사용자가 접근 가능한 recommendation인지 확인
→ running_sessions INSERT
→ status = IN_PROGRESS
→ started_at = now()
```

주의:

- 최신 문서에서는 `running_sessions.status`가 필요하다.
- 현재 DB migration에 status 컬럼이 없으면 먼저 migration 보강이 필요하다.

### GPS 트랙포인트 저장

현재 라우터 기준:

`POST /api/running-sessions/trackpoints`

기준 문서의 더 명확한 후보:

`POST /api/running-sessions/:runningSessionIdx/trackpoints`

Request:

```json
{
  "sessionId": 32,
  "points": [
    {
      "clientTrackpointId": "550e8400-e29b-41d4-a716-446655440000",
      "point": {
        "latitude": 37.544123,
        "longitude": 127.055321
      },
      "recordedAt": "2026-09-01T15:31:03+09:00",
      "accuracyM": 4.8
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "savedCount": 1
  }
}
```

흐름:

```text
authenticate
→ runningTrackpointsSchema 검증
→ running session 조회
→ users_idx 소유권 확인
→ status = IN_PROGRESS 확인
→ 좌표 범위 확인
→ PostGIS Point 생성 시 longitude, latitude 순서 사용
→ running_trackpoints INSERT
→ client_trackpoint_id 기준 ON CONFLICT DO NOTHING
→ savedCount 반환
```

중복 방지:

- React Native가 네트워크 장애 후 같은 GPS를 다시 보낼 수 있다.
- `client_trackpoint_id`는 클라이언트가 생성한다.
- DB unique 제약과 `ON CONFLICT`를 이용한다.

### 러닝 종료

현재 라우터 기준:

`POST /api/running-sessions/finish`

기준 문서의 더 명확한 후보:

`POST /api/running-sessions/:runningSessionIdx/finish`

Request:

```json
{
  "sessionId": 32,
  "status": "COMPLETED"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "runningSessionIdx": 32,
    "status": "COMPLETED",
    "distance": 5273,
    "averagePace": 349,
    "startedAt": "2026-09-01T15:30:00+09:00",
    "finishedAt": "2026-09-01T16:00:40+09:00"
  }
}
```

흐름:

```text
authenticate
→ runningFinishSchema 검증
→ running session 조회
→ 소유권 확인
→ status = IN_PROGRESS 확인
→ trackpoints를 recorded_at 순서로 조회
→ GPS 이상값 제거
→ 인접 point 간 거리 계산
→ 전체 실제 거리 계산
→ 평균 페이스 계산
→ running_sessions UPDATE
→ 응답 반환
```

거리 계산:

- DB에서 `ST_Distance`를 쓰려면 geography 변환 또는 EPSG:5179 변환을 고려한다.
- 처음 구현은 service에서 좌표 기반 Haversine 계산으로 시작해도 된다.
- 정확도를 올릴 때 PostGIS 계산으로 옮기면 된다.

### 페이스 분석

`GET /api/running-sessions/:sessionIdx/pace`

Response:

```json
{
  "success": true,
  "data": {
    "sessionId": 32,
    "splits": [
      {
        "fromKm": 0,
        "toKm": 1,
        "paceSecPerKm": 330
      }
    ]
  }
}
```

흐름:

```text
authenticate
→ sessionIdx params 검증
→ session 소유권 확인
→ trackpoints 시간순 조회
→ 누적 거리 계산
→ 1km 단위 split 생성
→ 각 구간 시간 계산
→ paceSecPerKm 반환
```

## 에러 방향

| 상황 | 권장 코드 |
|---|---|
| 세션 없음 | `RUNNING_SESSION_NOT_FOUND` |
| 소유자 불일치 | `FORBIDDEN` |
| 이미 종료된 세션 | `RUNNING_SESSION_ALREADY_FINISHED` |
| 트랙포인트 부족 | `NOT_ENOUGH_TRACKPOINTS` |
| 좌표 오류 | `INVALID_COORDINATE` |
| 추천 코스 없음 | `ROUTE_RECOMMENDATION_NOT_FOUND` |

## 구현 시 우선순위

1. 러닝 시작
2. 트랙포인트 bulk insert
3. 러닝 종료 시 거리/페이스 계산
4. 기록 목록 조회
5. 페이스 split 분석
