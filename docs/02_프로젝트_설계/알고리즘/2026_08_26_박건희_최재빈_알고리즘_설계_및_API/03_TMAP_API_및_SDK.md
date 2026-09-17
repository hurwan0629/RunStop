# 1. TMAP API 및 SDK 활용 영역

RunStop에서는 TMAP을 단순히 지도를 표시하는 용도로만 사용하지 않고, 장소 검색, 좌표 변환, 보행 경로 생성, 경로 표시, 내비게이션 등의 기능에 활용한다.

단, 러닝 코스 자체의 점수 계산과 추천 순위 결정은 RunStop 자체 알고리즘에서 수행한다.

전체 역할은 다음과 같이 구분한다.

```text
TMAP
→ 지도
→ 장소 검색
→ 주소 / 좌표 변환
→ 실제 보행 가능한 경로 생성
→ 경로 표시
→ 내비게이션

RunStop
→ 화장실 분석
→ 편의점 분석
→ 공원 분석
→ 가로등 분석
→ CCTV 분석
→ 고도 / 경사도 분석
→ 사용자 가중치 적용
→ 최종 추천 순위 결정
```

---

## 1.1 지도 표시

RunStop 앱의 지도 화면은 TMAP Map SDK를 이용한다.

주요 사용 기능:

```text
지도 표시
지도 확대 / 축소
지도 이동

출발지 Marker
목적지 Marker
현재 위치 Marker

추천 러닝 코스 Polyline

화장실 Marker
편의점 Marker
공원 Marker
```

구조:

```text
RunStop 서버

추천 경로 좌표
+
시설 위경도

↓

RunStop 앱

↓

TMAP Map SDK

↓

지도 표시
```

공공데이터에 포함된 화장실, 편의점 등의 시설은 TMAP 자체 데이터가 아니라 RunStop이 가지고 있는 위경도를 TMAP 지도 위에 Marker로 표시한다.

---

## 1.2 장소 검색

사용자가 출발지 또는 목적지를 직접 검색할 경우 TMAP의 POI 검색 기능을 사용한다.

예:

```text
사용자 입력

"서울숲역"

↓

TMAP POI Search API

↓

장소명
주소
위도
경도

↓

RunStop 출발지 / 목적지 설정
```

RunStop 내부에서는 검색 결과를 다음 형식으로 통일한다.

```json
{
  "name": "서울숲역",
  "address": "서울특별시 성동구 ...",
  "latitude": 37.543,
  "longitude": 127.044
}
```

---

## 1.3 주소 → 좌표 변환

주소만 가지고 있는 경우 TMAP Geocoding 기능을 이용한다.

```text
서울특별시 성동구 ...

↓

Geocoding

↓

latitude
longitude
```

RunStop 내부에서는 최종적으로 다음 형식으로 관리한다.

```json
{
  "latitude": 37.543,
  "longitude": 127.044
}
```

---

## 1.4 좌표 → 주소 변환

GPS 또는 지도에서 얻은 위경도를 사람이 읽을 수 있는 주소로 보여줄 경우 Reverse Geocoding을 사용할 수 있다.

```text
37.543, 127.044

↓

Reverse Geocoding

↓

서울특별시 성동구 ...
```

사용 예:

```text
현재 위치 표시
최근 러닝 위치 표시
출발지 주소 표시
러닝 기록 상세주소 표시
```

---

## 1.5 보행 경로 생성

RunStop 코스 추천에서 가장 중요한 TMAP 기능이다.

사용자의 출발지, 목적지 및 후보 경유지를 TMAP 보행자 경로 API에 전달한다.

```text
출발지

+

후보 경유지

+

목적지

↓

TMAP 보행자 경로 API

↓

실제 보행 가능한 경로
```

TMAP이 반환한 경로는 여러 개의 좌표로 구성된다.

예:

```text
P1
37.5430, 127.0440

P2
37.5432, 127.0445

P3
37.5436, 127.0450
```

RunStop Backend에서는 이 좌표를 공통 Route 형식으로 변환한다.

```json
{
  "routeId": 101,

  "coordinates": [
    {
      "latitude": 37.5430,
      "longitude": 127.0440
    },
    {
      "latitude": 37.5432,
      "longitude": 127.0445
    }
  ]
}
```

이후 공간분석을 위해 LineString으로 변환한다.

```text
TMAP Response

↓

TmapRouteAdapter

↓

RunStop Route

↓

LineString

↓

공간데이터 분석
```

---

## 1.6 후보 경로 여러 개 생성

TMAP 경로 API가 자동으로 RunStop에 필요한 TOP 3 러닝 코스를 만들어주는 것은 아니다.

RunStop에서 서로 다른 후보 경유지를 생성한 뒤 TMAP에 각각 경로를 요청한다.

예:

```text
후보 1

출발지
→ 공원 A
→ 지점 B
→ 출발지


후보 2

출발지
→ 지점 C
→ 공원 D
→ 출발지


후보 3

출발지
→ 지점 E
→ 지점 F
→ 출발지
```

각 후보에 대해:

```text
TMAP 보행자 경로 API

↓

실제 보행 경로

↓

RunStop 점수 계산
```

을 수행한다.

즉:

```text
후보 경로 생성 전략
= RunStop

실제 보행 가능한 도로 계산
= TMAP
```

으로 역할을 구분한다.

---

## 1.7 경로선 표시

TMAP에서 반환된 경로 좌표를 Map SDK를 통해 지도 위에 Polyline 형태로 표시한다.

```text
추천 코스 좌표

↓

Polyline

↓

TMAP 지도

━━━━━━━━━━━━
```

TOP 3 경로를 보여주는 경우:

```text
코스 A
코스 B
코스 C
```

를 각각 선택하여 지도에 표시할 수 있다.

---

## 1.8 GPS

GPS 위치 자체를 TMAP API가 생성하는 것은 아니다.

현재 위치 정보는 스마트폰의 위치 기능을 통해 획득한다.

```text
스마트폰 GPS

↓

latitude
longitude

↓

RunStop 앱

↓

TMAP 지도 위 현재 위치 표시
```

역할:

```text
스마트폰
→ 현재 위치 측정

TMAP
→ 현재 위치를 지도에 표시
```

RunStop은 이 GPS 좌표를 이용하여 다음 값을 직접 계산한다.

```text
이동 거리
현재 페이스
평균 페이스
실제 이동 경로
```

---

## 1.9 TMAP Navi SDK

러닝 중 턴바이턴 길 안내가 필요한 경우 Navi SDK를 사용할 수 있다.

활용 가능 영역:

```text
현재 진행 방향

다음 방향 안내

경로 이탈 확인

경로 재탐색

목적지 도착 안내
```

예:

```text
현재 위치

↓

100m 앞 우회전

↓

경로 이탈

↓

재탐색

↓

추천 코스로 복귀
```

초기 MVP에서는 다음 기능을 먼저 구현할 수 있다.

```text
GPS
+
TMAP Map SDK
+
추천 경로 Polyline
```

그 후 필요 시 Navi SDK를 추가한다.

---

## 1.10 TMAP과 RunStop 역할 구분

| 기능 | TMAP | RunStop |
|---|---|---|
| 지도 표시 | O | |
| 지도 확대 / 축소 | O | |
| 장소 검색 | O | |
| 주소 → 좌표 | O | |
| 좌표 → 주소 | O | |
| 보행 경로 생성 | O | |
| 경유지 기반 경로 | O | |
| 경로선 표시 | O | |
| Navi 기능 | O | |
| GPS 센서 | X | 스마트폰 |
| 현재 페이스 계산 | X | O |
| 화장실 점수 | X | O |
| 편의점 점수 | X | O |
| 공원 점수 | X | O |
| 가로등 점수 | X | O |
| CCTV 점수 | X | O |
| 경사도 점수 | X | O |
| 사용자 가중치 적용 | X | O |
| 최종 TOP 3 결정 | X | O |

---

## 1.11 TMAP 데이터 변환 규칙

TMAP과 RunStop 내부 데이터 형식이 다르기 때문에 Adapter를 사용한다.

```text
TMAP API Response

↓

TmapRouteAdapter

↓

RunStop 공통 Route
```

RunStop Route 예:

```json
{
  "routeId": 101,

  "distanceKm": 7.1,

  "coordinates": [
    {
      "latitude": 37.543,
      "longitude": 127.044
    }
  ]
}
```

추천 알고리즘은 TMAP의 원본 Response를 직접 사용하지 않고, 반드시 RunStop 공통 Route 형식으로 변환한 데이터를 사용한다.

이렇게 하면 TMAP 응답 구조가 변경되거나 향후 다른 지도 API를 사용하더라도 추천 알고리즘 전체를 수정하지 않아도 된다.

---

## 1.12 TMAP 호출 병목 관리

후보 경로 수가 많아질수록 TMAP API 호출 횟수도 증가한다.

예:

```text
후보 경유지 조합 10개

↓

TMAP 요청 10회
```

따라서 후보를 무제한 생성하지 않는다.

권장 구조:

```text
사용자 조건

↓

주변 후보 지점 검색

↓

의미 있는 후보 경유지 조합 생성

↓

TMAP 호출

↓

거리 조건에 크게 벗어나는 경로 제거

↓

공간데이터 분석
```

또한 같은 조건의 경로를 반복해서 요청하지 않도록 캐시 적용을 검토한다.

```text
동일한 출발지
+
동일한 목적지
+
동일한 경유지

↓

기존 경로 존재

↓

TMAP 재호출 생략
```