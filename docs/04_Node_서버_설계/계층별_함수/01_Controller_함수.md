# Controller 함수

Controller는 HTTP 요청을 검증하고 Service를 호출한 뒤 `success/data` 응답을 만든다. 요청 검증은 `zod.safeParse`를 기준으로 처리하고, 실패 시 전역 에러 미들웨어로 `ApiError`를 전달한다.

## AuthController

### `login(req, res, next): Promise<void>`

- 인자 DTO: `LoginDTO`
- 응답 DTO: `AuthResponseDTO`
- 요청 스키마: `loginSchema`
- 작업 내용:
  - `req.body`를 `loginSchema.safeParse`로 검증한다.
  - 검증 실패 시 `ApiError(INVALID_LOGIN_REQUEST)`를 전달한다.
  - `loginUser(loginDto)`를 호출한다.
  - `authResponseSchema`로 응답 형태를 한 번 더 확인한다.

### `checkLoginId(req, res, next): Promise<void>`

- 인자 DTO: `LoginIdCheckDTO`
- 응답 DTO: `{ available: boolean }`
- 요청 스키마: `loginIdCheckSchema`
- 작업 내용:
  - 회원가입용 로그인 아이디 형식을 검증한다.
  - `checkLoginIdAvailability(loginId)`를 호출한다.
  - 사용 가능 여부를 `data.available`로 반환한다.

### `sendSignupPhoneVerification(req, res, next): Promise<void>`

- 인자 DTO: `PhoneVerificationSendDTO`
- 응답 DTO: `{ verificationId: string; expiresInSec: number }`
- 요청 스키마: `phoneVerificationSendSchema`
- 작업 내용:
  - 전화번호 형식을 검증한다.
  - `sendSignupPhoneVerification(phone)`를 호출한다.
  - 인증 요청 ID와 인증번호 만료 시간을 반환한다.

### `verifySignupPhoneCode(req, res, next): Promise<void>`

- 인자 DTO: `PhoneVerificationVerifyDTO`
- 응답 DTO: `{ verified: true }`
- 요청 스키마: `phoneVerificationVerifySchema`
- 작업 내용:
  - 인증 요청 ID와 6자리 인증번호를 검증한다.
  - `verifySignupPhoneCode(input)`를 호출한다.
  - 인증 성공 여부를 반환한다.

### `signup(req, res, next): Promise<void>`

- 인자 DTO: `SignupDTO`
- 응답 DTO: `AuthResponseDTO`
- 요청 스키마: `signupSchema`
- 작업 내용:
  - 회원가입 요청 값을 검증한다.
  - `signupUser(signupDto)`를 호출한다.
  - 계정 생성 후 액세스 토큰과 사용자 기본 정보를 반환한다.

### `sendFindIdPhoneVerification(req, res, next): Promise<void>`

- 인자 DTO: `PhoneVerificationSendDTO`
- 응답 DTO: `{ verificationId: string; expiresInSec: number }`
- 요청 스키마: `phoneVerificationSendSchema`
- 작업 내용:
  - 전화번호 형식을 검증한다.
  - `sendFindIdPhoneVerification(input)`를 호출한다.
  - 아이디 찾기용 인증 요청을 생성한다.

### `verifyFindIdPhoneCode(req, res, next): Promise<void>`

- 인자 DTO: `PhoneVerificationVerifyDTO`
- 응답 DTO: `{ loginId: string }`
- 요청 스키마: `phoneVerificationVerifySchema`
- 작업 내용:
  - 인증번호 입력값을 검증한다.
  - `verifyFindIdPhoneCode(input)`를 호출한다.
  - 인증된 전화번호에 연결된 로그인 아이디를 반환한다.

### `sendPasswordResetPhoneVerification(req, res, next): Promise<void>`

- 인자 DTO: `PasswordResetPhoneVerificationSendDTO`
- 응답 DTO: `{ verificationId: string; expiresInSec: number }`
- 요청 스키마: `passwordResetPhoneVerificationSendSchema`
- 작업 내용:
  - 로그인 아이디와 전화번호 형식을 검증한다.
  - `sendPasswordResetPhoneVerification(input)`를 호출한다.
  - 비밀번호 재설정용 인증 요청을 생성한다.

### `verifyPasswordResetPhoneCode(req, res, next): Promise<void>`

- 인자 DTO: `PhoneVerificationVerifyDTO`
- 응답 DTO: `{ verified: true }`
- 요청 스키마: `phoneVerificationVerifySchema`
- 작업 내용:
  - 인증 요청 ID와 인증번호를 검증한다.
  - `verifyPasswordResetPhoneCode(input)`를 호출한다.
  - 인증 완료 상태를 서버 Map에 남긴다.

### `resetPassword(req, res, next): Promise<void>`

- 인자 DTO: `PasswordResetDTO`
- 응답 DTO: `{ reset: true }`
- 요청 스키마: `passwordResetSchema`
- 작업 내용:
  - 인증 요청 ID와 새 비밀번호 형식을 검증한다.
  - `resetUserPassword(input)`를 호출한다.
  - 비밀번호 재설정 성공 여부를 반환한다.

## UsersController

### `getMyPage(req, res, next): Promise<void>`

- 인자 DTO: 인증 미들웨어가 넣은 `req.user.idx`
- 응답 DTO: `MyPageResponseDTO`
- 응답 스키마: `myPageResponseSchema`
- 작업 내용:
  - `req.user` 존재 여부를 확인한다.
  - `getMyPageSummary(req.user.idx)`를 호출한다.
  - 사용자 기본 정보, 프로필, 현재 목표, 러닝 요약, 코스 즐겨찾기 요약을 `success/data`로 반환한다.

### `updateMe(req, res, next): Promise<void>`

- 인자 DTO: `UserProfileUpdateDTO`
- 응답 DTO: `UserUpdateResponseDTO`
- 요청 스키마: `userProfileUpdateSchema`
- 응답 스키마: `userUpdateResponseSchema`
- 작업 내용:
  - `req.user` 존재 여부를 확인한다.
  - `req.body`를 `userProfileUpdateSchema.safeParse`로 검증한다.
  - `updateCurrentUser(req.user.idx, parseResult.data)`를 호출한다.
  - 수정된 사용자 정보와 프로필 정보를 `success/data`로 반환한다.

### `withdrawMe(req, res, next): Promise<void>`

- 인자 DTO: 인증 미들웨어가 넣은 `req.user.idx`
- 응답 DTO: `{ withdrawn: true }`
- 작업 내용:
  - `req.user` 존재 여부를 확인한다.
  - `withdrawCurrentUser(req.user.idx)`를 호출한다.
  - 탈퇴 처리 결과를 `success/data`로 반환한다.

## 추가 구현 Controller

- `running.controller.ts`: `listRunningSessions`, `startRunningSession`, `saveRunningTrackpoints`, `finishRunningSession`, `getRunningPace`
- `routes.controller.ts`: `recommendRoutes`, `selectRouteRecommendation`, `getRouteDetail`
- `goals.controller.ts`: `getCurrentGoal`, `createGoal`, `stopGoal`
- `bookmarks.controller.ts`: `listPointBookmarks`, `createPointBookmark`, `deletePointBookmark`, `listRouteBookmarks`, `createRouteBookmark`, `deleteRouteBookmark`
- `inquiries.controller.ts`: `listInquiries`, `createInquiry`, `getInquiryDetail`, `updateInquiryStatus`, `answerInquiry`

공통 예정 역할:

- 요청 DTO를 검증한다.
- 인증된 사용자 컨텍스트를 읽는다.
- 대응하는 Service 함수를 호출한다.
- `success/data` 응답을 반환한다.
