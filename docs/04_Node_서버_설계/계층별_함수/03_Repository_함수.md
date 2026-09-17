# Repository 함수

Repository는 DB 접근과 row 매핑을 담당한다. 구현된 함수는 실제 SQL 기준으로 작성하고, 아직 남은 skeleton 함수는 예정 역할만 기록한다.

## UsersRepository

### `findUserByLoginId(loginId: string, client?: QueryClient): Promise<LoginUserRow | null>`

- 인자 DTO: `loginId`
- 반환값 DTO: `LoginUserRow | null`
- 조회 컬럼:
  - `[users.idx]`
  - `[users.login_id]`
  - `[users.password_hash]`
  - `[users.nickname]`
  - `[users.role]`
  - `[users.status]`
  - `[users.suspended_until]`
- 작업 내용:
  - 로그인 아이디로 사용자 1명을 조회한다.
  - DB snake_case 컬럼을 camelCase row 타입으로 변환한다.

### `findUserByPhone(phone: string, client?: QueryClient): Promise<UserLookupRow | null>`

- 인자 DTO: `phone`
- 반환값 DTO: `UserLookupRow | null`
- 조회 컬럼:
  - `[users.idx]`
  - `[users.login_id]`
  - `[users.nickname]`
  - `[users.role]`
  - `[users.phone]`
  - `[users.status]`
  - `[users.total_exp]`
- 작업 내용:
  - 전화번호로 사용자 1명을 조회한다.
  - 회원가입 중복 검사와 아이디 찾기에 사용한다.

### `findUserByIdx(idx: number, client?: QueryClient): Promise<UserLookupRow | null>`

- 인자 DTO: `idx`
- 반환값 DTO: `UserLookupRow | null`
- 조회 컬럼:
  - `[users.idx]`
  - `[users.login_id]`
  - `[users.nickname]`
  - `[users.role]`
  - `[users.phone]`
  - `[users.status]`
  - `[users.total_exp]`
- 작업 내용:
  - 사용자 기본 키로 사용자 1명을 조회한다.
  - 마이페이지 응답에 필요한 사용자 기본 정보와 경험치를 조회한다.

### `findUserByLoginIdAndPhone(loginId: string, phone: string, client?: QueryClient): Promise<PasswordResetUserRow | null>`

- 인자 DTO: `PasswordResetPhoneVerificationSendDTO`
- 반환값 DTO: `PasswordResetUserRow | null`
- 조회 컬럼:
  - `[users.idx]`
  - `[users.login_id]`
  - `[users.phone]`
  - `[users.status]`
- 작업 내용:
  - 로그인 아이디와 전화번호가 모두 일치하는 사용자를 조회한다.
  - 비밀번호 재설정 대상 확인에 사용한다.

### `findAuthUserByIdx(idx: number, client?: QueryClient): Promise<AuthUserRow | null>`

- 인자 DTO: JWT payload의 `idx`
- 반환값 DTO: `AuthUserRow | null`
- 조회 컬럼:
  - `[users.idx]`
  - `[users.role]`
  - `[users.status]`
  - `[users.suspended_until]`
- 작업 내용:
  - 인증 미들웨어에서 필요한 최소 사용자 상태만 조회한다.

### `createUser(input: CreateUserInput, client?: QueryClient): Promise<CreatedUserRow>`

- 인자 DTO: `CreateUserInput`
- 반환값 DTO: `CreatedUserRow`
- 저장 컬럼:
  - `[users.login_id]`
  - `[users.password_hash]`
  - `[users.nickname]`
  - `[users.phone]`
  - `[users.status]`
  - `[users.role]`
- 작업 내용:
  - 정상 상태의 사용자 계정을 생성한다.
  - 생성된 사용자 idx, nickname, role을 반환한다.

### `updateLastLoginAt(userIdx: number, client?: QueryClient): Promise<void>`

- 인자 DTO: `userIdx`
- 반환값: 없음
- 변경 컬럼:
  - `[users.last_login_at]`
- 작업 내용:
  - 마지막 로그인 시각을 현재 시각으로 갱신한다.

### `restoreExpiredSuspension(userIdx: number, client?: QueryClient): Promise<void>`

- 인자 DTO: `userIdx`
- 반환값: 없음
- 변경 컬럼:
  - `[users.status]`
  - `[users.suspended_until]`
  - `[users.updated_at]`
- 작업 내용:
  - 기간 정지가 만료된 사용자를 정상 상태로 복구한다.

### `updatePasswordHash(userIdx: number, passwordHash: string, client?: QueryClient): Promise<void>`

- 인자 DTO: `{ userIdx: number; passwordHash: string }`
- 반환값: 없음
- 변경 컬럼:
  - `[users.password_hash]`
  - `[users.updated_at]`
- 작업 내용:
  - 비밀번호 재설정 후 새 비밀번호 해시를 저장한다.

### `updateUser(userIdx: number, input: UpdateUserInput, client?: QueryClient): Promise<UserLookupRow | null>`

- 인자 DTO: 사용자 idx, `UpdateUserInput`
- 반환값 DTO: `UserLookupRow | null`
- 변경 컬럼:
  - `[users.nickname]`
  - `[users.updated_at]`
- 작업 내용:
  - 탈퇴하지 않은 사용자만 수정한다.
  - 수정된 사용자 기본 정보를 반환한다.

### `withdrawUser(userIdx: number, input: WithdrawUserInput, client?: QueryClient): Promise<boolean>`

- 인자 DTO: 사용자 idx, `WithdrawUserInput`
- 반환값: 변경 성공 여부
- 변경 컬럼:
  - `[users.status]`
  - `[users.withdrawn_at]`
  - `[users.updated_at]`
  - `[users.login_id]`
  - `[users.phone]`
  - `[users.password_hash]`
- 작업 내용:
  - 사용자를 `WITHDRAWN` 상태로 변경한다.
  - unique 필드인 로그인 아이디와 전화번호를 재사용 가능한 상태로 정리한다.
  - 비밀번호 해시는 로그인 불가능한 무효 해시로 변경한다.

## UserProfilesRepository

### `createUserProfile(input: CreateUserProfileInput, client?: QueryClient): Promise<void>`

- 인자 DTO: `CreateUserProfileInput`
- 반환값: 없음
- 저장 컬럼:
  - `[user_profiles.users_idx]`
  - `[user_profiles.weight]`
  - `[user_profiles.height]`
  - `[user_profiles.running_settings]`
- 작업 내용:
  - 회원가입 직후 사용자 초기 프로필 행을 생성한다.

### `findProfileByUserIdx(userIdx: number, client?: QueryClient): Promise<UserProfileRow | null>`

- 인자 DTO: 사용자 idx
- 반환값 DTO: `UserProfileRow | null`
- 조회 컬럼:
  - `[user_profiles.weight]`
  - `[user_profiles.height]`
  - `[user_profiles.running_settings]`
- 작업 내용:
  - 사용자 프로필을 조회한다.
  - DB에 `profile_image_url` 컬럼이 없으므로 `profileImageUrl`은 `null`로 반환한다.

### `updateUserProfile(userIdx: number, input: UpdateUserProfileInput, client?: QueryClient): Promise<UserProfileRow | null>`

- 인자 DTO: 사용자 idx, `UpdateUserProfileInput`
- 반환값 DTO: `UserProfileRow | null`
- 변경 컬럼:
  - `[user_profiles.weight]`
  - `[user_profiles.height]`
  - `[user_profiles.running_settings]`
- 작업 내용:
  - 사용자 프로필 값을 수정한다.
  - `running_settings`는 JSONB 그대로 저장한다.

## RunningGoalsRepository

### `findActiveGoalByUserIdx(userIdx: number, client?: QueryClient): Promise<ActiveGoalRow | null>`

- 인자 DTO: 사용자 idx
- 반환값 DTO: `ActiveGoalRow | null`
- 조회 컬럼:
  - `[running_goals.idx]`
  - `[running_goals.goal_type]`
  - `[running_goals.target_distance]`
  - `[running_goals.status]`
  - `[running_goals.start_date]`
  - `[running_goals.end_date]`
- 작업 내용:
  - 현재 `ACTIVE` 상태의 목표를 최신 생성순으로 1개 조회한다.

### `findRunningGoalByIdxAndUserIdx(goalIdx: number, userIdx: number, client?: QueryClient): Promise<ActiveGoalRow | null>`

- 인자 DTO: 목표 idx, 사용자 idx
- 반환값 DTO: `ActiveGoalRow | null`
- 작업 내용:
  - 사용자가 소유한 목표를 조회한다.

### `createRunningGoal(input: CreateRunningGoalInput, client?: QueryClient): Promise<ActiveGoalRow>`

- 인자 DTO: `CreateRunningGoalInput`
- 반환값 DTO: `ActiveGoalRow`
- 작업 내용:
  - 사용자 목표를 `ACTIVE` 상태로 생성한다.

### `stopRunningGoal(goalIdx: number, userIdx: number, client?: QueryClient): Promise<ActiveGoalRow | null>`

- 인자 DTO: 목표 idx, 사용자 idx
- 반환값 DTO: `ActiveGoalRow | null`
- 작업 내용:
  - 사용자가 소유한 `ACTIVE` 목표를 `STOPPED`로 변경한다.
  - `finished_at`을 현재 시각으로 기록한다.

### `updateExpiredGoals(userIdx: number, client?: QueryClient): Promise<ActiveGoalRow[]>`

- 인자 DTO: 사용자 idx
- 반환값 DTO: `ActiveGoalRow[]`
- 작업 내용:
  - `end_date < CURRENT_DATE`인 `ACTIVE` 목표만 갱신한다.
  - 목표 종료일 당일에는 갱신하지 않는다.
  - 목표 기간 내 러닝 거리 합계가 목표 이상이면 `SUCCESS`, 아니면 `FAILED`로 변경한다.

## RunningSessionsRepository

### `summarizeRunningSessionsByUserIdx(userIdx: number, client?: QueryClient): Promise<RunningSummaryRow>`

- 인자 DTO: 사용자 idx
- 반환값 DTO: `RunningSummaryRow`
- 조회 컬럼:
  - `[running_sessions.idx]`
  - `[running_sessions.status]`
  - `[running_sessions.distance]`
  - `[running_sessions.average_pace]`
- 작업 내용:
  - `IN_PROGRESS` 상태를 제외한다.
  - 러닝 총 횟수, 총 거리, 최고 페이스를 집계한다.
  - 최고 페이스는 sec/km 기준이므로 `MIN(average_pace)`를 사용한다.

### `sumRunningDistanceByUserIdxAndPeriod(userIdx: number, startDate: string, endDate: string, client?: QueryClient): Promise<number>`

- 인자 DTO: 사용자 idx, 시작일, 종료일
- 반환값: 거리 합계 m
- 조회 컬럼:
  - `[running_sessions.status]`
  - `[running_sessions.started_at]`
  - `[running_sessions.distance]`
- 작업 내용:
  - `IN_PROGRESS` 상태를 제외한다.
  - 목표 시작일부터 종료일까지의 러닝 거리 합계를 계산한다.

### `sumRunningDistanceByUserIdxAndGoalPeriodUntilToday(userIdx: number, startDate: string, endDate: string, client?: QueryClient): Promise<number>`

- 인자 DTO: 사용자 idx, 시작일, 종료일
- 반환값: 거리 합계 m
- 조회 컬럼:
  - `[running_sessions.status]`
  - `[running_sessions.started_at]`
  - `[running_sessions.distance]`
- 작업 내용:
  - `IN_PROGRESS` 상태를 제외한다.
  - DB `CURRENT_DATE` 기준으로 목표 시작일부터 오늘까지의 러닝 거리 합계를 계산한다.

## BookmarksRepository

### `countRouteBookmarksByUserIdx(userIdx: number, client?: QueryClient): Promise<number>`

- 인자 DTO: 사용자 idx
- 반환값: 코스 즐겨찾기 개수
- 조회 컬럼:
  - `[route_bookmarks.users_idx]`
  - `[route_bookmarks.idx]`
- 작업 내용:
  - 사용자가 등록한 코스 즐겨찾기 개수를 계산한다.

## 기타 Repository Skeleton

아래 함수들은 아직 실제 도메인 로직 구현 전 skeleton 상태다.

- `running-sessions.repository.ts`: `findRunningSessionsByUserIdx`, `findLatestCompletedSessionByUserIdx`, `createRunningSession`, `findRunningSessionByIdxAndUserIdx`, `updateRunningSessionResult`
- `running-trackpoints.repository.ts`: `createRunningTrackpoints`, `findTrackpointsBySessionIdx`
- `route-requests.repository.ts`: `createRouteRequest`, `createRouteRequestPoints`, `selectRecommendationForRequest`, `findRouteRequestByIdxAndUserIdx`
- `route-recommendations.repository.ts`: `createRouteRecommendations`, `findRouteRecommendationByIdx`, `findRouteRecommendationsByRequestIdx`, `findRouteDetailByIdx`
- `route-points.repository.ts`: `createRoutePoints`, `findRoutePointsByRecommendationIdx`
- `bookmarks.repository.ts`: `findPointBookmarksByUserIdx`, `createPointBookmark`, `deletePointBookmarkByIdxAndUserIdx`, `findRouteBookmarksByUserIdx`, `createRouteBookmark`, `deleteRouteBookmarkByIdxAndUserIdx`
- `inquiries.repository.ts`: `findInquiries`, `createInquiry`, `findInquiryByIdx`, `updateInquiryStatus`, `answerInquiry`
