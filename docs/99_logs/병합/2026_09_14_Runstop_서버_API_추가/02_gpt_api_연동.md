# GPT API 연동 정리

## 대상 파일

```text
backend/src/adapters/llm/llm.client.ts
backend/src/adapters/llm/implements/llm.api.ts
backend/src/services/route-recommendation.service.ts
```

## `llm.client.ts`

`LLM_MODE`를 직접 `process.env`에서 읽지 않고 검증된 `env.LLM_MODE`를 사용한다.

```ts
export function createRouteConditionLlmClient(
  mode: LlmMode = env.LLM_MODE,
): RouteConditionLlmClient {
  if (mode === "api") return new ApiLlmClient();
  if (mode === "local") return new LocalLlmClient();
  return new MockLlmClient();
}
```

이유:

```text
환경 변수 검증 책임을 config/env.ts로 모은다.
adapter 선택 로직은 기존 mock/local/api 구조를 유지한다.
```

## `llm.api.ts`

OpenAI Chat Completions 호환 요청을 유지했다.

```ts
body: JSON.stringify({
  model: this.model,
  messages,
  response_format: { type: "json_object" },
})
```

보강한 내용:

```text
LLM_API_URL 누락 검증
LLM_API_KEY 누락 검증
실패 응답 status와 body 일부를 ApiError.details에 포함
조건 파싱과 코스 이름 생성을 공통 requestJson()으로 처리
```

## `route-recommendation.service.ts`

LLM 조건 파싱 실패 시 추천 요청 전체를 실패시키지 않고 원래 요청으로 진행한다.

```ts
try {
  parsedConditions = await getRouteConditionLlmClient().parseRouteConditions({
    prompt: dto.prompt,
    targetDistance: dto.elementConditions.targetDistance,
  });
} catch (error) {
  logger.warn(
    {
      serviceName: "routes",
      action: "applyLlmRouteConditions",
      err: error,
    },
    "service:llm_condition_parse_failed",
  );

  return dto;
}
```

이유:

```text
LLM은 route recommendation의 보조 기능이다.
조건 파싱 실패가 전체 경로 추천 실패로 이어지면 사용자 경험이 과하게 취약해진다.
```

## 참고

현재 구현은 `https://api.openai.com/v1/chat/completions` 같은 Chat Completions 호환 URL을 받는다.
