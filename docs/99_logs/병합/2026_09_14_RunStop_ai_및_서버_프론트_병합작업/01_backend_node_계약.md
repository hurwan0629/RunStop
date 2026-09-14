# Backend Node 계약 병합 정리

## 대상 파일

```text
backend/src/dto/route/route-request.dto.ts
backend/src/services/route-recommendation.service.ts
backend/src/dto/worker/worker-route-request.dto.ts
backend/src/dto/route/route-recommendation.dto.ts
backend/src/repositories/route-requests.repository.ts
backend/src/repositories/route-recommendations.repository.ts
```

## `route-request.dto.ts`

최종 요청 필드는 다음 구조로 정리했다.

```ts
export const routeElementConditionsSchema = z.object({
  targetDistance: z.number().positive(),
  maxSlope: z.number().nonnegative().optional(),
  facilityPreferences: z.object({
    toilet: z.enum(["PREFER", "IGNORE"]),
    store: z.enum(["PREFER", "IGNORE"]),
  }),
  weights: z.record(z.string(), z.unknown()).default({}).transform(sanitizeRouteWeights),
  requirements: z.record(z.string(), z.unknown()).default({}).transform(sanitizeRouteRequirements),
}).catchall(z.unknown());
```

### 변경 이유

- `integration/routing-data-check`의 프론트는 `facilityPreferences`를 보낸다.
- `personal/hurwan`의 서버는 `weights`와 `requirements` sanitizer를 갖고 있다.
- 두 방향을 합쳐 프론트 계약과 서버 방어 로직을 함께 유지했다.

### `requirements` 정리

`requirements`는 boolean hard condition만 받도록 정리했다.

```ts
export type RouteRequirementValue = boolean;
```

`max_slope_pct`, `max_slope`, `maxSlope` 숫자 requirement는 Node wire DTO에서 직접 받지 않는다.

이유:

```text
maxSlope는 프론트/Node 계약에서 별도 필드로 관리한다.
Python parser가 maxSlope를 requirements["max_slope_pct"]로 변환한다.
Node request DTO의 requirements에 숫자를 허용하면 worker DTO의 dict[str, bool] 계약과 충돌한다.
```

## `route-recommendation.service.ts`

### LLM 조건 병합

LLM 결과는 `weights` 보강에만 반영하고, `requirements`는 사용자/프론트 요청 값을 유지한다.

```ts
return {
  ...dto,
  elementConditions: {
    ...dto.elementConditions,
    weights: {
      ...parsedConditions.weights,
      ...dto.elementConditions.weights,
    },
    requirements: dto.elementConditions.requirements,
  },
};
```

이유:

```text
LLM이 "화장실 있으면 좋겠다"를 requirements.toilet = true로 해석하면 soft preference가 hard constraint로 바뀐다.
현재 서비스에서는 LLM을 주로 weights 보강 역할로 둔다.
AI 학습 호환용 requirements 변환은 routing-worker selector의 AI 호출 경계에서 처리한다.
```

### slope fallback 유지

`integration/routing-data-check`의 slope fallback 흐름을 유지했다.

```text
requested maxSlope가 엄격해서 후보가 부족하면:
  5 -> 8 -> 제한 없음
  8 -> 12 -> 제한 없음
  그 외 -> 제한 없음
```

후보 중복은 path fingerprint로 제거한다.

```ts
function getCandidateFingerprint(candidate: WorkerRouteCandidateDTO): string {
  return candidate.path
    .map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`)
    .join("|");
}
```

### slope fallback status 저장

추천 후보의 `featureValues.slopeConstraint`에 실제 적용된 경사 조건을 남긴다.

```ts
slopeConstraint: {
  requestedMaxSlopePct: requestedMaxSlope ?? null,
  appliedMaxSlopePct: appliedMaxSlope ?? null,
  status,
}
```

이유:

```text
프론트/디버깅/추후 분석에서 요청 경사 조건이 그대로 충족됐는지, 후보 확보를 위해 완화됐는지 구분할 수 있다.
```

### 추천 선택 API

선택 API는 idempotent하게 정리했다.

```text
이미 같은 recommendation 선택:
  성공 응답 반환

이미 다른 recommendation 선택:
  409 ROUTE_REQUEST_ALREADY_SELECTED
```

이유:

```text
프론트에서 동일 요청 재시도나 중복 탭이 발생해도 같은 선택에 대해서는 실패로 보지 않는다.
다른 추천으로 바꾸는 것은 상태 변경 충돌이므로 409를 유지한다.
```

## 응답 계약

프론트가 기대하는 추천 응답 필드를 유지한다.

```text
recommendations[].slope
recommendations[].featureScores
recommendations[].facilities.toilet.count
recommendations[].facilities.toilet.status
recommendations[].facilities.store.count
recommendations[].facilities.store.status
```

이 값들은 worker 응답의 `featureValues`와 `featureScores`를 Node service에서 DTO로 풀어 반환한다.
