# Middleware 함수

Middleware는 HTTP 요청 흐름의 공통 처리를 담당합니다.

## Auth Middleware

### `authenticate(req, res, next): Promise<void>`

- 인자 DTO: `Authorization: Bearer <token>`
- 반환값: 없음
- 저장 상태:
  - `req.user = { idx: number; role: "USER" | "ADMIN" }`
- 작업 내용:
  - Authorization 헤더 존재 여부를 확인합니다.
  - Bearer 토큰 형식을 검사합니다.
  - JWT를 검증합니다.
  - payload의 `idx`, `role` 형식을 검사합니다.
  - `validateAccessTokenUser(idx)`로 DB의 최신 상태를 확인합니다.
  - 인증된 사용자 컨텍스트를 `req.user`에 넣습니다.

### `requireAdmin(req, res, next): void`

- 인자 DTO: `req.user`
- 반환값: 없음
- 작업 내용:
  - `authenticate` 이후 실행됩니다.
  - `req.user.role`이 `ADMIN`인지 확인합니다.
  - 관리자가 아니면 접근을 막습니다.

### `requireGuest(req, res, next): void`

- 인자 DTO: 선택적 Authorization 헤더
- 반환값: 없음
- 작업 내용:
  - 이미 로그인한 사용자의 게스트 API 접근을 막습니다.
  - 로그인, 회원가입, 아이디 찾기, 비밀번호 재설정에 사용합니다.

## Error Middleware

### `new ApiError(options: ApiErrorOptions)`

- 인자 DTO: `{ status: number; code: string; message: string; details?: unknown }`
- 반환값: `ApiError`
- 작업 내용:
  - 전역 실패 응답으로 변환 가능한 애플리케이션 에러를 생성합니다.

### `errorHandler(error, req, res, next): void`

- 인자 DTO: `unknown`
- 반환값: 없음
- 응답 DTO:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "message",
    "details": {}
  }
}
```

- 작업 내용:
  - `ApiError`는 지정된 status/code/message/details로 응답합니다.
  - 알 수 없는 에러는 500 응답으로 통일합니다.

### `notFoundHandler(req, res, next): void`

- 인자 DTO: Express request
- 반환값: 없음
- 작업 내용:
  - 등록된 라우터와 매칭되지 않은 요청을 404 `ApiError`로 넘깁니다.

## Async Handler

### `asyncHandler(handler): RequestHandler`

- 인자 DTO: 비동기 Express handler
- 반환값: Express `RequestHandler`
- 작업 내용:
  - async controller에서 발생한 rejected promise를 `next(error)`로 넘깁니다.

## Validate Middleware

### `validate(schema: ZodSchema, source: "body" | "params" | "query")`

- 인자 DTO: Zod schema와 검증 위치
- 반환값: Express middleware
- 작업 내용:
  - 요청의 지정된 위치를 Zod로 검증합니다.
  - 공통 검증 미들웨어로 사용할 수 있는 skeleton입니다.
