# BookmarksController 구현 방향

## 담당 범위

사용자가 자주 쓰는 장소와 코스를 저장하고 조회하는 흐름을 담당한다.

- 장소 즐겨찾기
- 코스 즐겨찾기

## 관련 파일

```text
backend/src/routes/bookmarks.routes.ts
backend/src/controllers/bookmarks.controller.ts
backend/src/services/bookmarks.service.ts
backend/src/repositories/bookmarks.repository.ts
backend/src/repositories/route-recommendations.repository.ts
```

## API 명세

### 장소 즐겨찾기 목록

`GET /api/bookmarks/points`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "idx": 1,
        "name": "집",
        "point": {
          "latitude": 37.55,
          "longitude": 126.92
        }
      }
    ]
  }
}
```

흐름:

```text
authenticate
→ bookmarksService.listPointBookmarks
→ bookmarksRepository.findPointBookmarksByUserIdx
→ PostGIS point를 latitude/longitude로 변환
```

### 장소 즐겨찾기 생성

`POST /api/bookmarks/points`

Request:

```json
{
  "name": "집",
  "point": {
    "latitude": 37.55,
    "longitude": 126.92
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "idx": 1,
    "name": "집",
    "point": {
      "latitude": 37.55,
      "longitude": 126.92
    }
  }
}
```

흐름:

```text
authenticate
→ pointBookmarkSchema 검증
→ 좌표 범위 확인
→ point_bookmarks INSERT
→ point 생성 시 longitude, latitude 순서 사용
```

### 장소 즐겨찾기 삭제

`DELETE /api/bookmarks/points/:bookmarkIdx`

Response:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

흐름:

```text
authenticate
→ bookmarkIdx params 검증
→ users_idx 조건을 포함해서 DELETE
→ 삭제 여부 반환
```

소유권은 별도 SELECT보다 `DELETE WHERE idx = ? AND users_idx = ?`로 처리하는 편이 단순하다.

### 코스 즐겨찾기 목록

`GET /api/bookmarks/routes`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "bookmarkIdx": 77,
        "recommendationId": 501,
        "name": "서울숲 야간 코스",
        "totalDistanceM": 5200,
        "totalAscentM": 34,
        "slopeStd": 1.2,
        "featureValues": {},
        "featureScores": {}
      }
    ]
  }
}
```

흐름:

```text
authenticate
→ route_bookmarks 조회
→ route_recommendations JOIN
→ route geometry는 목록에서는 제외
→ 요약 데이터 반환
```

목록에서는 route 전체 좌표를 빼는 편이 좋다. 지도 상세 화면에서만 전체 좌표를 내려준다.

### 코스 즐겨찾기 생성

`POST /api/bookmarks/routes`

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
    "bookmarkIdx": 77,
    "recommendationId": 501
  }
}
```

흐름:

```text
authenticate
→ routeBookmarkSchema 검증
→ route_recommendations 존재 확인
→ 현재 사용자가 접근 가능한 추천 코스인지 확인
→ route_bookmarks INSERT
→ UNIQUE(users_idx, route_recommendations_idx) 충돌 처리
```

### 코스 즐겨찾기 삭제

`DELETE /api/bookmarks/routes/:bookmarkIdx`

Response:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

흐름:

```text
authenticate
→ bookmarkIdx params 검증
→ users_idx 조건 포함 DELETE
→ 삭제 여부 반환
```

## 에러 방향

| 상황 | 권장 코드 |
|---|---|
| 즐겨찾기 없음 | `BOOKMARK_NOT_FOUND` |
| 좌표 오류 | `INVALID_COORDINATE` |
| 추천 코스 없음 | `ROUTE_RECOMMENDATION_NOT_FOUND` |
| 이미 저장된 코스 | `BOOKMARK_ALREADY_EXISTS` |
| 소유자 불일치 | `FORBIDDEN` |

## 구현 시 우선순위

1. 장소 즐겨찾기 CRUD
2. 코스 즐겨찾기 생성/삭제
3. 코스 즐겨찾기 목록 조회
4. 마이페이지 즐겨찾기 개수 집계와 연결
