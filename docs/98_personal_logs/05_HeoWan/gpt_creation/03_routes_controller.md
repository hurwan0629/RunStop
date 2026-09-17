# RoutesController 구현 방향

## 담당 범위

러닝 코스 추천 요청과 추천 결과 조회를 담당한다.

- 경로 추천 요청 생성
- Python routing-worker 호출
- 추천 후보 저장
- 추천 후보 선택
- 코스 상세 조회

## 관련 파일

```text
backend/src/routes/routes.routes.ts
backend/src/controllers/routes.controller.ts
backend/src/services/route-recommendation.service.ts
backend/src/repositories/route-requests.repository.ts
backend/src/repositories/route-recommendations.repository.ts
backend/src/repositories/route-points.repository.ts
backend/src/adapters/worker/routing-worker.client.ts
backend/src/adapters/tmap/tmap.client.ts
backend/src/adapters/llm/llm.client.ts
```

## API 명세

### 추천 생성

`POST /api/routes/recommend`

Request:

```json
{
  "prompt": "7km 정도, 오르막은 적고 화장실이 있었으면 좋겠어",
  "points": [
    {
      "sequence": 0,
      "type": "START",
      "point": {
        "latitude": 37.544,
        "longitude": 127.037
      }
    },
    {
      "sequence": 1,
      "type": "END",
      "point": {
        "latitude": 37.52,
        "longitude": 127.103
      }
    }
  ],
  "conditions": {
    "targetDistanceM": 7000,
    "distanceToleranceM": 500,
    "maxSlopePercent": 5,
    "preferToilet": true,
    "preferConvenienceStore": false,
    "preferNightInfrastructure": true
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "requestId": 101,
    "recommendations": [
      {
        "idx": 501,
        "score": 92.3,
        "totalDistanceM": 7100,
        "totalAscentM": 34,
        "slopeStd": 1.2,
        "featureValues": {},
        "featureScores": {},
        "path": []
      }
    ]
  }
}
```

흐름:

```text
authenticate
→ routeRequestSchema 검증
→ routeRecommendationService.recommendRoutes
→ route_requests INSERT
→ route_request_points INSERT
→ workerRouteRequestDTO 생성
→ routingWorkerClient.requestRouteRecommendations
→ worker response 검증
→ route_recommendations INSERT
→ route_points INSERT 필요 시 수행
→ 추천 후보 DTO 반환
```

트랜잭션 방향:

- `route_requests`와 `route_request_points` 저장은 하나의 transaction으로 묶는다.
- worker 호출은 DB transaction 밖에서 하는 편이 좋다. 외부 호출이 느려지면 DB connection을 오래 잡기 때문이다.
- worker 응답을 저장하는 작업은 별도 transaction으로 묶는다.

추천 요청 실패 시:

- request만 저장되고 recommendation이 없을 수 있다.
- 단순 구현에서는 worker 실패 시 request까지 rollback하는 방향도 가능하다.
- 이력을 남기고 싶다면 `route_requests.status` 같은 컬럼이 필요하다.

### 추천 코스 선택

`POST /api/routes/:requestIdx/select`

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
    "selectedRecommendationId": 501
  }
}
```

흐름:

```text
authenticate
→ requestIdx params 검증
→ routeSelectSchema 검증
→ route_requests 소유자 확인
→ recommendation이 해당 request 소속인지 확인
→ route_requests.selected_recommendations_idx UPDATE
```

중요:

- `recommendationId`가 다른 사람의 요청에 속한 후보이면 막아야 한다.
- DB FK만으로는 “해당 request의 후보인지”까지 보장하기 어렵기 때문에 service에서 확인한다.

### 코스 상세 조회

`GET /api/routes/:routeIdx`

Response:

```json
{
  "success": true,
  "data": {
    "idx": 501,
    "score": 92.3,
    "totalDistanceM": 7100,
    "totalAscentM": 34,
    "slopeStd": 1.2,
    "featureValues": {},
    "featureScores": {},
    "path": [
      {
        "latitude": 37.544,
        "longitude": 127.037
      }
    ],
    "points": [],
    "createdAt": "2026-09-01T15:30:00+09:00"
  }
}
```

흐름:

```text
authenticate
→ routeIdx params 검증
→ recommendation 조회
→ recommendation 접근 권한 확인
→ route geometry를 latitude/longitude 배열로 변환
→ route_points 조회
→ 상세 DTO 반환
```

PostGIS 변환:

```sql
ST_AsGeoJSON(route)
```

또는 repository에서 `ST_DumpPoints`를 이용해 좌표 배열로 변환한다.

## Adapter 방향

### routing-worker

처음에는 단순 HTTP client로 충분하다.

```text
Node
→ POST ${WORKER_URL}/routes/recommend
→ candidates 반환
```

worker가 아직 명확하지 않다면 adapter는 다음 책임만 가진다.

- request DTO를 worker 형식으로 변환
- timeout 설정
- worker 장애를 서비스 에러로 변환
- response DTO 검증

### TMAP

TMAP은 이 controller에서 직접 호출하지 않고, worker 또는 service에서 필요할 때 adapter를 통해 사용한다.

현재 단계에서는 실제 구현보다 interface 위치만 잡아두면 된다.

### LLM

자연어 조건 구조화가 필요하면 route recommendation 전에 LLM adapter를 호출한다. 단, LLM 결과는 바로 믿지 않고 Zod schema로 다시 검증한다.

## 에러 방향

| 상황 | 권장 코드 |
|---|---|
| 좌표 오류 | `INVALID_COORDINATE` |
| 추천 요청 없음 | `ROUTE_REQUEST_NOT_FOUND` |
| 추천 후보 없음 | `ROUTE_RECOMMENDATION_NOT_FOUND` |
| 소유자 불일치 | `FORBIDDEN` |
| worker timeout | `ROUTING_WORKER_TIMEOUT` |
| worker 응답 형식 오류 | `INVALID_WORKER_RESPONSE` |

## 구현 시 우선순위

1. route request 저장
2. worker client mock 구현
3. worker response 저장
4. 상세 조회 geometry 변환
5. 선택 API 소유권 검증
