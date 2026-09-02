# Service 함수

Service는 비즈니스 흐름을 조립하고 Repository, Adapter, Transaction 호출을 묶는다.

## AuthService

### `hashPassword(password: string): Promise<string>`

- 인자 DTO: 평문 비밀번호 문자열
- 반환값: bcrypt 해시 문자열
- 작업 내용:
  - `env.BCRYPT_SALT_ROUNDS` 값을 사용한다.
  - 평문 비밀번호를 bcrypt 해시로 변환한다.

### `checkLoginIdAvailability(loginId: string): Promise<{ available: boolean }>`

- 인자 DTO: `LoginIdCheckDTO.loginId`
- 반환값: `{ available: boolean }`
- 작업 내용:
  - `findUserByLoginId(loginId)`를 호출한다.
  - 사용자가 없으면 `available: true`를 반환한다.

### `sendSignupPhoneVerification(phone: string): Promise<{ verificationId: string; expiresInSec: number }>`

- 인자 DTO: `PhoneVerificationSendDTO.phone`
- 반환값: 전화번호 인증 요청 결과
- 작업 내용:
  - `findUserByPhone(phone)`으로 전화번호 중복을 검사한다.
  - 중복이 없으면 `sendPhoneVerification({ purpose: "SIGNUP", phone })`를 호출한다.

### `verifySignupPhoneCode(input: PhoneVerificationVerifyDTO): Promise<{ verified: true }>`

- 인자 DTO: `PhoneVerificationVerifyDTO`
- 반환값: `{ verified: true }`
- 작업 내용:
  - `verifyPhoneCode({ purpose: "SIGNUP", ...input })`를 호출한다.
  - 인증 성공 후 회원가입에서 사용할 수 있는 인증 완료 상태를 남긴다.

### `signupUser(signupDto: SignupDTO): Promise<AuthResponseDTO>`

- 인자 DTO: `SignupDTO`
- 반환값: `AuthResponseDTO`
- 작업 내용:
  - `getVerifiedPhoneVerification`으로 회원가입 전화번호 인증 완료 상태를 확인한다.
  - 인증된 전화번호와 요청 전화번호가 같은지 검사한다.
  - 로그인 아이디와 전화번호 중복을 검사한다.
  - 비밀번호를 bcrypt로 해시한다.
  - `withTransaction` 안에서 `users`와 `user_profiles`를 생성한다.
  - 인증 Map을 소비한다.
  - 액세스 토큰과 사용자 기본 정보를 반환한다.

### `loginUser(loginDto: LoginDTO): Promise<AuthResponseDTO>`

- 인자 DTO: `LoginDTO`
- 반환값: `AuthResponseDTO`
- 작업 내용:
  - 로그인 아이디로 사용자를 조회한다.
  - bcrypt로 비밀번호를 비교한다.
  - 탈퇴, 영구 정지, 기간 정지 상태를 검사한다.
  - 기간 정지가 만료되었으면 사용자 상태를 복구한다.
  - 마지막 로그인 시각을 갱신한다.
  - JWT를 발급한다.

### `sendFindIdPhoneVerification(input: PhoneVerificationSendDTO): Promise<{ verificationId: string; expiresInSec: number }>`

- 인자 DTO: `PhoneVerificationSendDTO`
- 반환값: 전화번호 인증 요청 결과
- 작업 내용:
  - 전화번호로 가입된 사용자를 조회한다.
  - 탈퇴 사용자는 막는다.
  - `purpose: "FIND_ID"`로 인증번호를 발송한다.

### `verifyFindIdPhoneCode(input: PhoneVerificationVerifyDTO): Promise<{ loginId: string }>`

- 인자 DTO: `PhoneVerificationVerifyDTO`
- 반환값: `{ loginId: string }`
- 작업 내용:
  - `purpose: "FIND_ID"` 인증번호를 검증한다.
  - 인증된 전화번호로 사용자를 다시 조회한다.
  - 로그인 아이디를 반환한다.
  - 사용한 인증 Map을 제거한다.

### `sendPasswordResetPhoneVerification(input: PasswordResetPhoneVerificationSendDTO): Promise<{ verificationId: string; expiresInSec: number }>`

- 인자 DTO: `PasswordResetPhoneVerificationSendDTO`
- 반환값: 전화번호 인증 요청 결과
- 작업 내용:
  - 로그인 아이디와 전화번호가 같은 사용자에 속하는지 검사한다.
  - 탈퇴 사용자는 막는다.
  - `purpose: "RESET_PASSWORD"`와 `loginId`를 포함해 인증번호를 발송한다.

### `verifyPasswordResetPhoneCode(input: PhoneVerificationVerifyDTO): Promise<{ verified: true }>`

- 인자 DTO: `PhoneVerificationVerifyDTO`
- 반환값: `{ verified: true }`
- 작업 내용:
  - `purpose: "RESET_PASSWORD"` 인증번호를 검증한다.
  - 비밀번호 재설정 단계에서 사용할 인증 완료 상태를 남긴다.

### `resetUserPassword(input: PasswordResetDTO): Promise<{ reset: true }>`

- 인자 DTO: `PasswordResetDTO`
- 반환값: `{ reset: true }`
- 작업 내용:
  - 비밀번호 재설정 인증 완료 상태를 조회한다.
  - 인증 정보에 `loginId`가 있는지 확인한다.
  - 로그인 아이디와 전화번호로 사용자를 조회한다.
  - 새 비밀번호를 bcrypt 해시로 저장한다.
  - 사용한 인증 Map을 제거한다.

### `validateAccessTokenUser(userIdx: number): Promise<AuthenticatedUser>`

- 인자 DTO: JWT payload의 `idx`
- 반환값: `AuthenticatedUser`
- 작업 내용:
  - DB에서 최신 사용자 상태와 권한을 조회한다.
  - 탈퇴 또는 정지 사용자를 막는다.
  - 미들웨어에서 사용할 `{ idx, role }`을 반환한다.

## PhoneVerificationService

### `sendPhoneVerification(input: SendPhoneVerificationInput): Promise<{ verificationId: string; expiresInSec: number }>`

- 인자 DTO: `{ purpose; phone; loginId? }`
- 반환값: 인증 요청 ID와 만료 초
- 작업 내용:
  - 6자리 인증번호를 생성한다.
  - 인증번호 해시와 만료 시각을 `verificationStore`에 저장한다.
  - SMS Adapter를 호출한다.

### `verifyPhoneCode(input: VerifyPhoneCodeInput): Promise<{ verified: true }>`

- 인자 DTO: `{ purpose; verificationId; code }`
- 반환값: `{ verified: true }`
- 작업 내용:
  - 인증 요청 존재 여부를 확인한다.
  - purpose 일치 여부를 검사한다.
  - 만료와 시도 횟수를 검사한다.
  - 인증번호 해시를 비교한다.
  - 인증 완료 상태와 10분 유효 시각을 저장한다.

### `consumePhoneVerification(verificationId: string): Promise<void>`

- 인자 DTO: 인증 요청 ID
- 반환값: 없음
- 작업 내용:
  - 사용 완료된 인증 요청을 `verificationStore`에서 제거한다.

### `getVerifiedPhoneVerification(input: GetVerifiedPhoneVerificationInput): VerificationRecord`

- 인자 DTO: `{ purpose; verificationId }`
- 반환값: 인증 완료된 `VerificationRecord`
- 작업 내용:
  - 인증 요청 존재 여부와 purpose를 검사한다.
  - 인증 완료 상태와 인증 완료 유효 시각을 확인한다.
  - 다음 단계에서 사용할 전화번호와 loginId를 반환한다.

## UsersService

### `getMyPageSummary(userIdx: number): Promise<MyPageResponseDTO>`

- 인자 DTO: 인증된 사용자 idx
- 반환값 DTO: `MyPageResponseDTO`
- 작업 내용:
  - `findUserByIdx(userIdx)`로 사용자 기본 정보와 `totalExp`를 조회한다.
  - `findProfileByUserIdx(userIdx)`로 프로필 정보를 조회한다.
  - `findActiveGoalByUserIdx(userIdx)`로 현재 활성 목표를 조회한다.
  - `summarizeRunningSessionsByUserIdx(userIdx)`로 `IN_PROGRESS`를 제외한 러닝 총 횟수, 총 거리, 최고 페이스를 집계한다.
  - `countRouteBookmarksByUserIdx(userIdx)`로 코스 즐겨찾기 개수를 집계한다.
  - 현재 목표가 있으면 `sumRunningDistanceByUserIdxAndPeriod`로 목표 시작일부터 오늘까지 달린 거리를 집계한다.
  - 현재 목표가 없으면 `currentGoal: null`을 반환한다.

### `updateCurrentUser(userIdx: number, updateDto: UserProfileUpdateDTO): Promise<UserUpdateResponseDTO>`

- 인자 DTO: 사용자 idx, `UserProfileUpdateDTO`
- 반환값 DTO: `UserUpdateResponseDTO`
- 작업 내용:
  - 수정할 값이 하나 이상 있는지 검사한다.
  - 사용자 존재 여부를 확인한다.
  - `withTransaction` 안에서 `users.nickname`과 `user_profiles` 값을 수정한다.
  - `runningSettings`는 Python 추천/분석 모듈 연동을 고려해 JSON 객체 형태로 유지한다.
  - 수정된 사용자와 프로필 정보를 반환한다.

### `withdrawCurrentUser(userIdx: number): Promise<{ withdrawn: true }>`

- 인자 DTO: 사용자 idx
- 반환값 DTO: `{ withdrawn: true }`
- 작업 내용:
  - 사용자 존재 여부와 이미 탈퇴된 상태인지 확인한다.
  - 무작위 문자열을 bcrypt 해시하여 무효 비밀번호 해시를 만든다.
  - `withdraw_${idx}_${random}` 형태의 익명 로그인 아이디를 만든다.
  - `withdrawUser`로 soft delete를 처리한다.

## GoalsService

### `getCurrentRunningGoal(userIdx: number): Promise<CurrentGoalResponseDTO>`

- 인자 DTO: 사용자 idx
- 반환값 DTO: `CurrentGoalResponseDTO`
- 작업 내용:
  - `refreshExpiredGoals(userIdx)`를 먼저 실행한다.
  - 현재 `ACTIVE` 목표를 조회한다.
  - 목표가 없으면 `goal: null`, 진행률 0을 반환한다.
  - 목표가 있으면 DB `CURRENT_DATE` 기준으로 목표 시작일부터 오늘까지의 러닝 거리를 집계한다.

### `createRunningGoal(userIdx: number, dto: GoalCreateDTO): Promise<GoalDTO>`

- 인자 DTO: 사용자 idx, `GoalCreateDTO`
- 반환값 DTO: `GoalDTO`
- 작업 내용:
  - 시작일이 종료일보다 늦으면 거부한다.
  - 만료된 기존 목표를 먼저 갱신한다.
  - 사용자에게 `ACTIVE` 목표가 남아 있으면 생성을 거부한다.
  - 새 목표를 `ACTIVE` 상태로 생성한다.

### `stopRunningGoal(userIdx: number, goalIdx: number): Promise<StopGoalResponseDTO>`

- 인자 DTO: 사용자 idx, 목표 idx
- 반환값 DTO: `StopGoalResponseDTO`
- 작업 내용:
  - 만료된 기존 목표를 먼저 갱신한다.
  - 사용자가 소유한 목표인지 확인한다.
  - `ACTIVE` 상태인 목표만 `STOPPED`로 변경한다.

### `refreshExpiredGoals(userIdx: number, client?: QueryClient): Promise<GoalDTO[]>`

- 인자 DTO: 사용자 idx, 선택적 DB client
- 반환값 DTO: `GoalDTO[]`
- 작업 내용:
  - `end_date < CURRENT_DATE`인 `ACTIVE` 목표만 갱신한다.
  - 종료일 당일 목표는 진행 가능한 상태로 유지한다.
  - 목표 기간 내 러닝 거리 합계가 목표 거리 이상이면 `SUCCESS`, 아니면 `FAILED`로 변경한다.

## 추가 구현 Service

- `running.service.ts`: `listRunningHistory`, `startRunningSession`, `saveRunningTrackpoints`, `finishRunningSession`
- `route-recommendation.service.ts`: `recommendRoutes`, `selectRouteRecommendation`, `getRouteDetail`
- `bookmarks.service.ts`: `listPointBookmarks`, `createPointBookmark`, `deletePointBookmark`, `listRouteBookmarks`, `createRouteBookmark`, `deleteRouteBookmark`
- `inquiries.service.ts`: `listInquiries`, `createInquiry`, `getInquiryDetail`, `updateInquiryStatus`, `answerInquiry`
- `pace-analysis.service.ts`: `analyzeSessionPace`
