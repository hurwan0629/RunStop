# Frontend, DB, Running 연동 병합 정리

## 대상 파일

```text
frontend/mobile/src/features/course/types.ts
frontend/mobile/src/features/course/api/courseApi.ts
frontend/mobile/src/features/course/screens/CourseConditionConfirmScreen.tsx
frontend/mobile/src/features/course/screens/CourseCompareScreen.tsx
backend/src/repositories/route-requests.repository.ts
backend/src/repositories/route-recommendations.repository.ts
backend/src/services/running.service.ts
infra/db/migrations/1789365502643_add-running-cancelled-and-route-type.js
```

## 프론트 요청 계약

프론트의 `RouteRequest`는 다음 구조를 기대한다.

```ts
export type RouteRequest = {
  prompt?: string;
  routeType: RouteType;
  startPoint: Pick<LocationPoint, "lat" | "lng">;
  waypoints: Pick<LocationPoint, "lat" | "lng">[];
  endPoint?: Pick<LocationPoint, "lat" | "lng">;
  elementConditions: {
    targetDistance: number;
    maxSlope?: number;
    weights: Record<string, number>;
    requirements?: Record<string, boolean>;
    facilityPreferences: {
      toilet: FacilityPreferenceMode;
      store: FacilityPreferenceMode;
    };
  };
};
```

이번 병합에서는 이 프론트 계약을 유지한다.

## 프론트 응답 계약

프론트는 추천 카드에서 다음 값을 사용한다.

```text
course.slope?.maxSlopePct
course.totalAscent
course.featureScores
course.facilities.toilet.count
course.facilities.toilet.status
course.facilities.store.count
course.facilities.store.status
```

따라서 Node 응답 DTO와 worker parser는 아래 정보를 유지해야 한다.

```text
slope
featureScores
featureValues.facilityStatus
featureValues.toilet_count
featureValues.store_count
```

## route_type 저장

`route_requests.route_type`은 새 migration으로 추가된다.

```text
infra/db/migrations/1789365502643_add-running-cancelled-and-route-type.js
```

이 값은 API 요청의 `LOOP`, `ROUND_TRIP`, `ONE_WAY`를 DB에 저장하기 위한 필드다.

이유:

```text
running 종료 판정에서 LOOP/ROUND_TRIP과 ONE_WAY를 구분해야 한다.
프론트가 어떤 코스 유형을 요청했는지 DB에 남겨야 이후 세션 판단이 가능하다.
```

## running 상태

새 migration은 running session 상태에 `CANCELLED`도 추가한다.

최종 의미는 다음 기준으로 정리한다.

```text
COMPLETED
  완주 조건을 만족한 정상 종료

STOPPED
  사용자가 중간에 멈췄거나 완주 조건을 만족하지 못한 종료

CANCELLED
  GPS 부족 등 실행 자체를 정상 기록으로 보기 어려운 취소
```

## ROUND_TRIP

현재 프론트 UI는 주로 다음 방식으로 route type을 만든다.

```text
endPoint 있음 -> ONE_WAY
endPoint 없음 -> LOOP
```

하지만 API/Node/Worker/Algorithm 계약은 `ROUND_TRIP`을 유지한다.

검증 기준:

```text
UI 선택지는 추후 추가하더라도
직접 API 요청으로 ROUND_TRIP이 Node -> Worker -> Algorithm -> DB -> Response 흐름을 통과해야 한다.
```
