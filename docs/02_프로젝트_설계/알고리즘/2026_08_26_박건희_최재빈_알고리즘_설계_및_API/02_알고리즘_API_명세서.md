# RunStop 코스 추천 API 명세서

## 1. API 개요

사용자가 입력한 출발지, 목적지, 목표 거리 및 러닝 조건을 전달받아 RunStop 추천 알고리즘으로 계산한 추천 코스 최대 3개를 반환한다.

---

# 2. 기본 정보

## Method

```text
POST
```

## Endpoint

```text
/api/v1/routes/recommend
```

## 인증

로그인 사용자 인증이 필요하다.

```text
Authorization: Bearer {accessToken}
```

---

# 3. Request

```json
{
  "start": {
    "latitude": 37.543,
    "longitude": 127.044
  },
  "end": {
    "latitude": 37.543,
    "longitude": 127.044
  },
  "routeType": "LOOP",
  "targetDistanceKm": 7.0,
  "distanceTolerance": 10,

  "requirements": {
    "toilet": true
  },

  "weights": {
    "distance": 5,
    "elevation": 4,
    "toilet": 5,
    "store": 2,
    "park": 3,
    "night": 5
  }
}
```

---

# 4. Request 필드

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| start | Object | Y | 출발지 |
| start.latitude | Double | Y | 출발지 위도 |
| start.longitude | Double | Y | 출발지 경도 |
| end | Object | 조건부 | 목적지 |
| end.latitude | Double | 조건부 | 목적지 위도 |
| end.longitude | Double | 조건부 | 목적지 경도 |
| routeType | String | Y | 코스 유형 |
| targetDistanceKm | Double | Y | 목표 거리(km) |
| distanceTolerance | Integer | N | 허용 거리 오차(%) |
| requirements | Object | N | 필수조건 |
| requirements.toilet | Boolean | N | 화장실 필수 여부 |
| weights | Object | Y | 각 조건 중요도 |
| weights.distance | Integer | Y | 거리 중요도 1~5 |
| weights.elevation | Integer | Y | 경사도 중요도 1~5 |
| weights.toilet | Integer | Y | 화장실 중요도 1~5 |
| weights.store | Integer | Y | 편의점 중요도 1~5 |
| weights.park | Integer | Y | 공원 중요도 1~5 |
| weights.night | Integer | Y | 야간 인프라 중요도 1~5 |

---

# 5. routeType

| 값 | 설명 |
|---|---|
| LOOP | 출발지와 도착지가 같은 순환형 |
| ONE_WAY | 출발지와 도착지가 다른 목적지형 |
| ROUND_TRIP | 목적지까지 이동 후 왕복 |

---

# 6. 성공 Response

```json
{
  "success": true,

  "data": {
    "exactMatch": true,

    "routes": [
      {
        "routeId": 101,

        "distanceKm": 7.1,

        "estimatedMinutes": 48,

        "elevationGain": 34,

        "elevationGainPerKm": 4.8,

        "toiletCount": 2,

        "nearestToiletDistance": 32,

        "storeCount": 3,

        "nearestStoreDistance": 45,

        "parkScore": 76,

        "streetlightScore": 92,

        "cctvScore": 78,

        "conditionScore": 89.7,

        "failedConditions": []
      }
    ]
  },

  "message": "추천 코스 조회가 완료되었습니다."
}
```

---

# 7. Response 필드

| 필드 | 타입 | 설명 |
|---|---|---|
| success | Boolean | 요청 성공 여부 |
| exactMatch | Boolean | 모든 필수조건 충족 여부 |
| routes | Array | 추천 경로 목록 |
| routeId | Long | 코스 ID |
| distanceKm | Double | 실제 코스 거리 |
| estimatedMinutes | Integer | 예상 시간 |
| elevationGain | Double | 누적 상승고도 |
| elevationGainPerKm | Double | 1km당 상승고도 |
| toiletCount | Integer | 주변 화장실 개수 |
| nearestToiletDistance | Double | 가장 가까운 화장실 거리 |
| storeCount | Integer | 주변 편의점 개수 |
| nearestStoreDistance | Double | 가장 가까운 편의점 거리 |
| parkScore | Double | 공원 점수 |
| streetlightScore | Double | 가로등 인프라 점수 |
| cctvScore | Double | CCTV 인프라 점수 |
| conditionScore | Double | 최종 조건 충족도 |
| failedConditions | Array | 충족하지 못한 필수조건 |

---

# 8. 조건 미충족 Response

조건을 완전히 만족하는 코스가 없어도 API 오류로 처리하지 않는다.

```json
{
  "success": true,

  "data": {
    "exactMatch": false,

    "routes": [
      {
        "routeId": 105,
        "distanceKm": 7.2,
        "toiletCount": 1,
        "conditionScore": 83.5,

        "failedConditions": [
          "화장실 최소 2개"
        ]
      }
    ],

    "relaxSuggestions": [
      {
        "condition": "TOILET",
        "current": 2,
        "suggested": 1
      }
    ]
  },

  "message": "모든 조건을 만족하는 코스가 없어 대안 코스를 제공합니다."
}
```

---

# 9. 코스 상세 조회 API

## Method

```text
GET
```

## Endpoint

```text
/api/v1/routes/{routeId}
```

예:

```text
/api/v1/routes/101
```

---

## Response

```json
{
  "success": true,

  "data": {
    "routeId": 101,

    "routeName": "서울숲 순환 코스 A",

    "distanceKm": 7.1,

    "estimatedMinutes": 48,

    "elevationGain": 34,

    "conditionScore": 89.7,

    "facilities": {
      "toilets": [
        {
          "name": "서울숲 공중화장실",
          "distanceFromRoute": 32,
          "latitude": 37.543,
          "longitude": 127.044
        }
      ],

      "stores": [
        {
          "name": "CU 서울숲점",
          "distanceFromRoute": 45,
          "latitude": 37.544,
          "longitude": 127.045
        }
      ]
    },

    "routeCoordinates": [
      {
        "latitude": 37.543,
        "longitude": 127.044
      }
    ],

    "recommendReasons": [
      "목표 거리와 유사합니다.",
      "누적 상승고도가 낮습니다.",
      "야간 조명 인프라가 풍부합니다."
    ]
  }
}
```

---

# 10. 오류 코드

| 코드 | HTTP Status | 설명 |
|---|---:|---|
| INVALID_REQUEST | 400 | 잘못된 요청 |
| INVALID_COORDINATE | 400 | 좌표 오류 |
| INVALID_DISTANCE | 400 | 목표 거리 오류 |
| INVALID_WEIGHT | 400 | 중요도 값 오류 |
| UNAUTHORIZED | 401 | 로그인 필요 |
| ROUTE_NOT_FOUND | 404 | 보행 경로를 찾지 못함 |
| NO_CANDIDATE_ROUTE | 404 | 후보 코스 생성 실패 |
| EXTERNAL_API_ERROR | 502 | TMAP 등 외부 API 오류 |
| DATA_NOT_AVAILABLE | 503 | 공공데이터를 사용할 수 없음 |
| INTERNAL_SERVER_ERROR | 500 | 서버 오류 |

---

# 11. 오류 Response 예시

```json
{
  "success": false,

  "code": "INVALID_WEIGHT",

  "message": "중요도는 1~5 사이의 값이어야 합니다."
}
```

---

# 12. 외부 API 연동 - TMAP

RunStop은 실제 보행 가능한 경로를 생성하기 위해 TMAP API를 사용한다.

RunStop 모바일 앱이 TMAP 보행 경로 API를 직접 호출하지 않고, RunStop Backend가 TMAP과 통신하는 구조를 사용한다.

```text
RunStop App

↓

RunStop Backend

↓

TMAP API

↓

RunStop Backend

↓

RunStop App
```

이 구조를 사용하는 이유는 다음과 같다.

- TMAP API Key를 앱에 직접 노출하지 않기 위해
- TMAP 응답 형식을 RunStop 내부 형식으로 변환하기 위해
- TMAP 오류를 Backend에서 일괄 처리하기 위해
- 추천 알고리즘과 TMAP을 분리하기 위해

---

## 12.1 TMAP 장소 검색 연동

### 목적

사용자가 입력한 장소명을 검색하여 출발지 또는 목적지의 주소와 위경도를 얻는다.

### 처리 흐름

```text
사용자

"서울숲역"

↓

RunStop App

↓

RunStop Backend

↓

TMAP POI Search API

↓

장소명 / 주소 / 위도 / 경도

↓

RunStop 공통 형식으로 변환

↓

App 반환
```

RunStop 내부 반환 형식 예:

```json
{
  "name": "서울숲역",
  "address": "서울특별시 성동구 ...",
  "latitude": 37.543,
  "longitude": 127.044
}
```

---

## 12.2 TMAP 보행 경로 연동

### 목적

출발지, 목적지 및 후보 경유지를 기반으로 실제 보행 가능한 경로를 생성한다.

### RunStop → TMAP 전달 데이터

```json
{
  "start": {
    "latitude": 37.543,
    "longitude": 127.044
  },
  "end": {
    "latitude": 37.543,
    "longitude": 127.044
  },
  "waypoints": [
    {
      "latitude": 37.545,
      "longitude": 127.047
    }
  ]
}
```

위 JSON은 RunStop 내부에서 사용하는 공통 구조이며, 실제 TMAP 요청 시에는 TMAP이 요구하는 Request 형식으로 변환하여 전달한다.

---

## 12.3 TMAP Response → RunStop Route 변환

TMAP이 반환하는 원본 응답을 추천 알고리즘에서 직접 사용하지 않는다.

중간 변환 단계를 거쳐 RunStop 공통 Route 형식으로 통일한다.

```text
TMAP Response

↓

TmapRouteAdapter

↓

RunStop Route

↓

추천 알고리즘
```

RunStop Route 예:

```json
{
  "routeId": 101,
  "distanceKm": 7.1,
  "coordinates": [
    {
      "latitude": 37.5430,
      "longitude": 127.0440
    },
    {
      "latitude": 37.5432,
      "longitude": 127.0445
    },
    {
      "latitude": 37.5436,
      "longitude": 127.0450
    }
  ]
}
```

### 필드 정의

| 필드 | 타입 | 설명 |
|---|---|---|
| routeId | Long | RunStop 내부 후보 경로 ID |
| distanceKm | Double | 전체 경로 거리 |
| coordinates | Array | 경로를 구성하는 좌표 목록 |
| latitude | Double | 위도 |
| longitude | Double | 경도 |

---

## 12.4 TMAP 연동 오류 처리

TMAP 호출 과정에서 오류가 발생하면 TMAP의 원본 오류를 앱에 그대로 전달하지 않는다.

RunStop 공통 오류 코드로 변환한다.

예:

```json
{
  "success": false,
  "code": "EXTERNAL_API_ERROR",
  "message": "보행 경로를 생성하는 중 외부 지도 API 오류가 발생했습니다."
}
```

주요 처리 대상:

```text
TMAP 응답 없음
TMAP 서버 오류
잘못된 좌표
보행 경로 없음
API 호출 제한
Timeout
```

---

## 12.5 TMAP API Key 관리

TMAP API Key는 모바일 앱에 직접 저장하지 않는다.

```text
X RunStop App
  → TMAP API Key 저장

O RunStop Backend
  → 환경변수 또는 Secret 관리
```

예:

```text
TMAP_API_KEY=********
```

모바일 앱은 RunStop Backend만 호출한다.

---

## 12.6 좌표 형식 규칙

RunStop 내부 JSON에서는 다음 형태를 사용한다.

```json
{
  "latitude": 37.543,
  "longitude": 127.044
}
```

TMAP이 요구하는 형식이 다를 경우 Adapter 단계에서 변환한다.

추천 알고리즘 내부 공간 분석에서는 좌표계를 별도로 변환할 수 있다.

```text
App / Backend / TMAP 통신

EPSG:4326

↓

공간 분석

EPSG:5179
```

---

## 12.7 TMAP과 RunStop 역할

| 영역 | 담당 |
|---|---|
| 장소 검색 | TMAP |
| 주소/좌표 변환 | TMAP |
| 실제 보행 경로 생성 | TMAP |
| 지도 표시 | TMAP Map SDK |
| 내비게이션 | TMAP Navi SDK |
| GPS 위치 측정 | 스마트폰 |
| 후보 경유지 생성 | RunStop |
| 화장실 분석 | RunStop |
| 편의점 분석 | RunStop |
| 공원 분석 | RunStop |
| 가로등 분석 | RunStop |
| CCTV 분석 | RunStop |
| 고도/경사 분석 | RunStop |
| 최종 추천 점수 | RunStop |
| TOP 3 선정 | RunStop |