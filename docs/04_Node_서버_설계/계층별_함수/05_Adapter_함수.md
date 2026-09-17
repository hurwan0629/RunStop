# Adapter 함수

Adapter는 외부 시스템 호출 세부사항을 Service 밖으로 분리합니다.

## SMS Adapter

### `sendVerificationSms(input: SendVerificationSmsInput): Promise<void>`

- 인자 DTO:

```ts
type SendVerificationSmsInput = {
  phone: string;
  code: string;
};
```

- 반환값: 없음
- 작업 내용:
  - `env.SMS_API_ENABLED`가 `false`면 콘솔에 인증번호를 출력합니다.
  - `env.SMS_API_ENABLED`가 `true`면 실제 SMS API 호출 구현으로 교체될 자리입니다.
  - 현재 실제 SMS API 모드는 `SMS_API_NOT_IMPLEMENTED`로 막습니다.

## Worker Adapter

### `checkRoutingWorkerHealth(): 미구현`

- 예정 인자 DTO: 없음
- 예정 반환값: Worker 상태
- 예정 작업:
  - `WORKER_URL` 기준으로 Python Worker 상태를 확인합니다.

### `requestRouteRecommendations(): 미구현`

- 예정 인자 DTO: `WorkerRouteRequestDTO`
- 예정 반환값: `WorkerRouteResponseDTO`
- 예정 작업:
  - 코스 추천 조건을 Worker에 전달합니다.
  - Worker 응답을 Node 내부 코스 추천 타입으로 변환합니다.

## LLM Adapter

### `parseRouteConditions(): 미구현`

- 예정 인자 DTO: 사용자 프롬프트
- 예정 반환값: 코스 추천 조건
- 예정 작업:
  - 자연어 입력에서 거리, 경사, 선호 조건을 구조화합니다.

## TMap Adapter

### `searchPlaces(): 미구현`

- 예정 인자 DTO: 검색어 또는 좌표
- 예정 반환값: 장소 후보 목록
- 예정 작업:
  - TMap 장소 검색 API를 호출합니다.

### `requestPedestrianRoute(): 미구현`

- 예정 인자 DTO: 출발지, 도착지, 경유지 좌표
- 예정 반환값: 보행자 경로 정보
- 예정 작업:
  - TMap 보행자 경로 API를 호출합니다.
  - 거리, 예상 시간, 경로 좌표를 내부 타입으로 변환합니다.
