# LLM 어댑터

## 역할

- 사용자 자연어 러닝 요구사항을 Python routing-worker에 전달할 `weights`, `requirements`로 변환합니다.
- Service가 특정 LLM API, SDK, 로컬 LLM 방식에 직접 의존하지 않도록 분리합니다.
- LLM 응답은 JSON 형태로 정리해서 반환합니다.

## 위치

```text
backend/src/adapters/llm
```

진입점:

```text
llm.client.ts
```

구현 파일:

```text
types.ts
prompt.ts
json.ts
implements/llm.mock.ts
implements/llm.api.ts
implements/llm.local.ts
```

## 사용 함수

```ts
parseRouteConditions(input)
```

내부에서는 `LLM_MODE` 값에 따라 구현체를 선택합니다.

```text
mock  → 규칙 기반 mock
api   → 외부 LLM API
local → 로컬 LLM
```

기본값은 `mock`입니다.

## 입력

```ts
type RouteConditionParseInput = {
  prompt: string;
  routeType?: "LOOP" | "ONE_WAY" | "ROUND_TRIP";
  targetDistance?: number;
  weights?: Record<string, number>;
  requirements?: Record<string, unknown>;
};
```

## 출력

```ts
type ParsedRouteConditions = {
  weights: Record<string, number>;
  requirements: Record<string, unknown>;
  raw?: Record<string, unknown>;
};
```

`weights`는 현재 `1~5` 범위로 정규화합니다.

## 설정값

외부 API:

```text
LLM_MODE=api
LLM_API_URL=
LLM_API_KEY=
LLM_MODEL=
```

로컬 LLM:

```text
LLM_MODE=local
LLM_LOCAL_URL=
LLM_LOCAL_MODEL=
```

## 에러

공통 `ApiError` 형태로 전달합니다.

```text
LLM_CONFIG_MISSING
LLM_API_REQUEST_FAILED
LOCAL_LLM_REQUEST_FAILED
INVALID_LLM_RESPONSE
```

JSON 파싱에 실패하면 빈 객체로 넘기지 않고 `INVALID_LLM_RESPONSE`로 처리합니다.
