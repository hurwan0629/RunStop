# UsersController 구현 방향

## 담당 범위

사용자 본인 정보와 계정 상태 변경을 담당한다.

- 마이페이지 조회
- 프로필 수정
- 회원 탈퇴

## 관련 파일

```text
backend/src/routes/users.routes.ts
backend/src/controllers/users.controller.ts
backend/src/services/users.service.ts
backend/src/repositories/users.repository.ts
backend/src/repositories/user-profiles.repository.ts
backend/src/repositories/running-goals.repository.ts
backend/src/repositories/running-sessions.repository.ts
backend/src/repositories/bookmarks.repository.ts
```

## API 명세

### 마이페이지 조회

`GET /api/users/me/mypage`

Header:

```http
Authorization: Bearer <token>
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "idx": 15,
      "loginId": "hurwan0629",
      "nickname": "허완",
      "exp": 1250
    },
    "goal": {
      "type": "WEEKLY",
      "targetDistance": 30000,
      "runningDistance": 17400
    },
    "running": {
      "totalCount": 24,
      "totalDistance": 183700
    },
    "bookmark": {
      "routeCount": 5
    },
    "pace": {
      "bestPace": 285
    }
  }
}
```

흐름:

```text
authenticate
→ controller에서 req.user.idx 확인
→ usersService.getMyPageSummary
→ usersRepository.findUserByIdx
→ goalsRepository.findActiveGoalByUserIdx
→ runningSessionsRepository.summarizeRunningSessionsByUserIdx
→ bookmarksRepository.countRouteBookmarksByUserIdx
→ 응답 DTO 조립
```

목표 진행률 계산:

- 현재 활성 목표가 있으면 `start_date ~ end_date` 범위의 완료 러닝 거리 합계를 계산한다.
- 활성 목표가 없으면 `goal = null` 또는 목표 없음 전용 응답을 내려준다.

주의:

- 기준 문서에서는 `running_sessions.distance` 집계 컬럼이 필요하다.
- 현재 migration에 이 컬럼이 없다면 트랙포인트에서 매번 계산해야 해서 느려질 수 있다.

### 프로필 수정

`PATCH /api/users/me`

Request:

```json
{
  "nickname": "새닉네임"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "idx": 15,
    "nickname": "새닉네임",
    "updatedAt": "2026-09-01T15:30:00+09:00"
  }
}
```

흐름:

```text
authenticate
→ userProfileUpdateSchema 검증
→ usersService.updateCurrentUser
→ 수정 가능한 필드만 필터링
→ usersRepository.updateUser
→ userProfilesRepository.updateUserProfile 필요 여부 확인
→ 변경된 값 반환
```

현재 기준 문서에서는 일반 프로필 수정 대상이 닉네임 중심이다. 전화번호 변경은 인증 정책이 필요하므로 일반 수정에서 제외하는 편이 안전하다.

### 회원 탈퇴

`DELETE /api/users/me`

Response:

```json
{
  "success": true,
  "data": {
    "withdrawn": true
  }
}
```

흐름:

```text
authenticate
→ usersService.withdrawCurrentUser
→ transaction 시작
→ users.phone = NULL
→ users.login_id = withdraw_[idx]_[random]
→ users.password_hash = bcrypt(randomBytes)
→ users.status = WITHDRAWN
→ users.withdrawn_at = now()
→ transaction commit
```

정책:

- `users` 행은 삭제하지 않는다.
- 러닝 기록, 추천 기록, 문의 기록은 FK 관계 때문에 보존한다.
- 탈퇴 후 기존 아이디와 전화번호는 재사용 가능하게 만든다.

## 에러 방향

| 상황 | 권장 코드 |
|---|---|
| 인증 없음 | `UNAUTHORIZED` |
| 사용자 없음 | `USER_NOT_FOUND` |
| 탈퇴 계정 | `WITHDRAWN_USER` |
| 닉네임 형식 오류 | `INVALID_NICKNAME` |
| 닉네임 중복 정책 적용 시 | `NICKNAME_ALREADY_EXISTS` |

## 구현 시 우선순위

1. `authenticate` 미들웨어와 `req.user` 타입 확정
2. 마이페이지 집계 쿼리 작성
3. 프로필 수정 가능 필드 확정
4. 회원 탈퇴 transaction 구현
