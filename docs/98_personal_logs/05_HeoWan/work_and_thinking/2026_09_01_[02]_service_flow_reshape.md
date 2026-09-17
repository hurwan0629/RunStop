# RunStop API / 서버 동작 정리

## 1. 회원가입

### 1-1. 아이디 중복 확인
`POST /api/auth/check-login-id`

```json
Request
{
  "loginId": "hurwan0629"
}

Response
{
  "available": true
}
```

서버 동작
- loginId 형식 검사
- users.login_id 조회
- 사용 가능 여부 반환
- 최종 회원가입 시 DB UNIQUE 기준으로 다시 확인

DB
- users.login_id


### 1-2. 전화번호 인증번호 요청
`POST /api/auth/phone/send`

```json
Request
{
  "phone": "01012345678"
}

Response
{
  "verificationId": "..."
}
```

서버 동작
- 전화번호 검사
- 인증번호 생성
- SMS 발송
- verificationId 생성
- Node 메모리에 임시 저장

메모리 예시

```ts
Map<verificationId, {
  phone: string;
  codeHash: string;
  expiresAt: Date;
  verified: boolean;
}>
```


### 1-3. 전화번호 인증 확인
`POST /api/auth/phone/verify`

```json
Request
{
  "verificationId": "...",
  "code": "123456"
}

Response
{
  "verified": true
}
```

서버 동작
- verificationId 조회
- 만료 여부 확인
- 인증번호 비교
- 성공 시 verified = true


### 1-4. 최종 회원가입
`POST /api/auth/signup`

```json
Request
{
  "loginId": "hurwan0629",
  "password": "password",
  "nickname": "허완",
  "phone": "01012345678",
  "verificationId": "..."
}
```

서버 동작
- verificationId 조회
- verified 확인
- 인증된 phone 확인
- loginId 최종 중복 확인
- password bcrypt hash
- users INSERT
- 사용한 verificationId 삭제

DB
- users.login_id
- users.password_hash
- users.nickname
- users.phone
- users.status = ENABLED
- users.role = USER


## 2. 아이디 찾기

### 2-1. 전화번호 인증 요청
`POST /api/auth/find-id/phone/send`

```json
Request
{
  "phone": "01012345678"
}

Response
{
  "verificationId": "..."
}
```

서버 동작
- 전화번호 확인
- 인증번호 발송
- verificationId 생성


### 2-2. 인증번호 확인 + 아이디 반환
`POST /api/auth/find-id/phone/verify`

```json
Request
{
  "verificationId": "...",
  "code": "123456"
}

Response
{
  "loginId": "hurwan0629"
}
```

서버 동작
- 인증번호 검증
- 인증된 phone으로 users 조회
- login_id 반환

DB
- users.phone
- users.login_id


## 3. 비밀번호 찾기 / 재설정

흐름

```text
아이디 확인
→ 전화번호 인증번호 요청
→ 인증 확인
→ 새 비밀번호 설정
```

### 3-1. 전화번호 인증 요청
`POST /api/auth/password/phone/send`

서버 동작
- login_id 확인
- 해당 login_id의 phone 확인
- 인증번호 생성
- SMS 발송
- verificationId 생성


### 3-2. 전화번호 인증 확인
`POST /api/auth/password/phone/verify`

서버 동작
- verificationId 조회
- 만료 여부 확인
- 인증번호 검증


### 3-3. 비밀번호 재설정
`POST /api/auth/password/reset`

서버 동작
- 인증 성공 여부 확인
- 새 password bcrypt hash
- users.password_hash UPDATE

DB
- users.login_id
- users.phone
- users.password_hash


## 4. 로그인

`POST /api/auth/login`

```json
Request
{
  "loginId": "hurwan0629",
  "password": "password"
}

Response
{
  "accessToken": "<JWT>"
}
```

서버 동작
- login_id 조회
- status 확인
- suspended 상태 확인
- bcrypt password 비교
- last_login_at 갱신
- JWT 생성 및 반환

이후 React Native 요청

```http
Authorization: Bearer <JWT>
```

DB
- users.login_id
- users.password_hash
- users.status
- users.suspended_until
- users.last_login_at


## 5. 로그아웃

현재 Stateless JWT 기준 서버 API 없음

React Native
- Secure Storage에서 JWT 삭제
- 로그인 화면으로 이동

서버
- JWT 별도 저장하지 않음


## 6. 프로필 수정

현재 수정 가능 항목
- nickname

`PATCH /api/users/me`

```http
Authorization: Bearer <JWT>
```

```json
Request
{
  "nickname": "새닉네임"
}
```

서버 동작
- JWT 검증
- 사용자 식별
- nickname 검증
- nickname UPDATE
- updated_at 갱신

DB
- users.nickname
- users.updated_at

전화번호
- 일반 프로필 수정에서는 변경 불가


## 7. 회원 탈퇴

`DELETE /api/users/me`

```http
Authorization: Bearer <JWT>
```

서버 동작
- JWT 사용자 확인
- phone = NULL
- login_id = withdraw_[idx]_[random]
- password_hash = bcrypt hash (crypto.randomBytes(32).toString("hex"))
- status = WITHDRAWN
- withdrawn_at = now()

DB
- users 행 자체는 삭제하지 않음
- 기존 기록/FK 관계 유지


## 8. 마이페이지 조회

`GET /api/users/me/mypage`

```http
Authorization: Bearer <JWT>
```

```json
Response
{
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
```

서버 동작
- users 조회
- running_goals 현재 목표 조회
- 목표 기간의 running_sessions 거리 SUM
- running_sessions COUNT
- running_sessions SUM(distance)
- running_sessions MIN(average_pace)
- route_bookmarks COUNT
- 하나의 마이페이지 DTO로 조립 후 반환

DB
- users
- running_goals
- running_sessions
- route_bookmarks


## 9. 러닝 기록 조회

`GET /api/running-sessions`

```http
Authorization: Bearer <JWT>
```

```json
Response
{
  "summary": {
    "totalDistance": 183700,
    "totalCount": 24,
    "longestDistance": 12400
  },
  "items": [
    {
      "date": "...",
      "distance": 5273,
      "name": "서울숲 5km 코스",
      "duration": 1840,
      "averagePace": 349,
      "status": "COMPLETED"
    }
  ]
}
```

서버 동작
- 사용자의 running_sessions 조회
- 총 거리 = SUM(distance)
- 총 러닝 횟수 = COUNT(*)
- 최장 거리 = MAX(distance)
- route_recommendations JOIN
- route_recommendations.name 조회
- duration = finished_at - started_at

DB

running_sessions
- started_at
- finished_at
- distance
- average_pace
- status
- route_recommendations_idx

route_recommendations
- name


## 10. 러닝 세션

상태

- IN_PROGRESS
- COMPLETED
- STOPPED
- FAILED


### 10-1. 러닝 시작
`POST /api/running-sessions`

```http
Authorization: Bearer <JWT>
```

```json
Request
{
  "routeRecommendationIdx": 15
}

Response
{
  "runningSessionIdx": 32,
  "status": "IN_PROGRESS",
  "startedAt": "2026-09-01T15:30:00+09:00"
}
```

서버 동작
- JWT 검증
- 사용자 식별
- routeRecommendationIdx 존재 여부 확인
- 사용자가 접근 가능한 추천 경로인지 확인
- running_sessions INSERT
- status = IN_PROGRESS
- started_at = now()
- 생성된 runningSessionIdx 반환

DB

running_sessions
- users_idx
- route_recommendations_idx
- status = IN_PROGRESS
- started_at


### 10-2. 러닝 GPS 기록 전송
`POST /api/running-sessions/{runningSessionIdx}/trackpoints`

```http
Authorization: Bearer <JWT>
```

```json
Request
{
  "trackpoints": [
    {
      "clientTrackpointId": "550e8400-e29b-41d4-a716-446655440000",
      "latitude": 37.544123,
      "longitude": 127.055321,
      "recordedAt": "2026-09-01T15:31:03+09:00",
      "accuracy": 4.8
    },
    {
      "clientTrackpointId": "550e8400-e29b-41d4-a716-446655440001",
      "latitude": 37.544201,
      "longitude": 127.055471,
      "recordedAt": "2026-09-01T15:31:06+09:00",
      "accuracy": 5.1
    }
  ]
}

Response
{
  "savedCount": 2
}
```

서버 동작
- JWT 검증
- runningSessionIdx 조회
- 해당 세션의 users_idx가 현재 사용자와 일치하는지 확인
- status가 IN_PROGRESS인지 확인
- latitude / longitude 검증
- recordedAt 검증
- geometry(Point, 4326) 생성
- running_trackpoints INSERT
- clientTrackpointId 기준으로 중복 데이터 저장 방지

DB

running_trackpoints
- client_trackpoint_id
- running_sessions_idx
- point
- recorded_at
- accuracy

특이사항
- GPS는 1개씩 보내기보다 여러 개를 배열로 묶어서 전송할 수 있도록 한다.
- 네트워크 연결이 끊긴 경우 React Native에서 임시 저장 후 다시 전송할 수 있다.
- 재전송 시 client_trackpoint_id를 이용하여 동일 GPS 데이터의 중복 저장을 방지한다.
- PostGIS point 생성 시 좌표 순서는 longitude, latitude를 사용한다.


### 10-3. 러닝 종료
`POST /api/running-sessions/{runningSessionIdx}/finish`

```http
Authorization: Bearer <JWT>
```

```json
Request
{
  "status": "COMPLETED"
}

Response
{
  "runningSessionIdx": 32,
  "status": "COMPLETED",
  "distance": 5273,
  "averagePace": 349,
  "startedAt": "2026-09-01T15:30:00+09:00",
  "finishedAt": "2026-09-01T16:00:40+09:00"
}
```

status

- COMPLETED: 정상 종료 / 완주
- STOPPED: 사용자가 중간에 직접 종료
- FAILED: 비정상적인 이유로 러닝 종료

서버 동작
- JWT 검증
- runningSessionIdx 조회
- 세션 소유 사용자 확인
- 현재 status가 IN_PROGRESS인지 확인
- running_trackpoints를 recorded_at 기준으로 시간순 조회
- GPS 이상값 정제
- 인접 point 간 이동거리 계산
- 전체 실제 러닝 거리 계산
- started_at / finished_at / 실제 거리를 이용하여 평균 페이스 계산
- running_sessions UPDATE
- 종료 결과 반환

DB

running_sessions
- distance
- average_pace
- finished_at
- status


## 거리 / 페이스 데이터 기준

route_recommendations.total_distance
= 알고리즘이 생성한 추천 코스의 예상 거리

running_trackpoints
= 사용자가 실제로 이동하면서 수집한 GPS 원본 데이터

running_sessions.distance
= running_trackpoints를 집계하여 계산한 실제 러닝 거리

running_sessions.average_pace
= 실제 러닝 거리와 시간을 기반으로 계산한 전체 평균 페이스
= 단위 sec/km


## 전체 흐름
```
POST /api/running-sessions
→ 러닝 세션 생성
→ status = IN_PROGRESS

        ↓

POST /api/running-sessions/{idx}/trackpoints
→ 러닝 중 GPS를 반복적으로 저장

        ↓

POST /api/running-sessions/{idx}/finish
→ GPS 정제
→ 실제 거리 계산
→ 평균 페이스 계산
→ status = COMPLETED / STOPPED / FAILED
→ 러닝 세션 종료
```

## 11. 페이스 분석

`GET /api/running-sessions/{sessionIdx}/pace`

```http
Authorization: Bearer <JWT>
```

현재 별도 분석 테이블 없음

서버 동작
- running_sessions 사용자 확인
- running_trackpoints 조회
- recorded_at 순서 정렬
- 인접 point 간 거리 계산
- 누적 거리 계산
- 0~1km / 1~2km / 2~3km ... 구간 분리
- 각 구간 시간 계산
- 구간별 평균 페이스 계산
- 결과 반환

DB

```text
running_sessions
    ↓ 1:N
running_trackpoints
- point
- recorded_at
```

## 특이사항

### 인증 / JWT
- 현재 서버에서는 JWT를 별도로 DB에 저장하지 않는다.
- React Native에서는 JWT를 Secure Storage에 저장하고 요청 시 `Authorization: Bearer <token>` 형태로 전달한다.
- 인증 토큰이 없거나 만료된 경우 로그인 화면으로 이동한다.
- 서버에서 인증 상태를 확인하는 동안 중복 요청 및 중복 화면 전환을 방지한다.
- 현재는 Stateless JWT를 사용하므로 로그아웃 시 서버에서 별도 처리하지 않고 클라이언트의 JWT를 삭제한다.
- 추후 Refresh Token 폐기 또는 세션 관리가 필요해지는 경우 별도 저장 정책을 추가한다.


### 로그인
- 아이디 미입력 시 `"아이디를 입력해 주세요."` 안내
- 비밀번호 미입력 시 `"비밀번호를 입력해 주세요."` 안내
- 아이디 또는 비밀번호가 일치하지 않을 경우 `"아이디 또는 비밀번호가 올바르지 않습니다."` 안내
- 연속 로그인 실패 5회 시 30초 동안 로그인 버튼 잠금
- 네트워크 오류 발생 시 다시 시도할 수 있도록 처리
- `SUSPENDED` 사용자는 이용 정지 안내
- `WITHDRAWN` 사용자는 탈퇴 계정 안내


### 회원가입
- 아이디 / 닉네임 / 비밀번호는 필수 입력
- 아이디 중복 확인 전에는 다음 단계 진행 불가
- 아이디 중복 시 회원가입 진행 불가
- 비밀번호 규칙 검증 필요
- 비밀번호 / 비밀번호 확인 값이 다르면 진행 불가
- 전화번호 인증이 완료되지 않으면 최종 회원가입 불가
- 인증번호 재전송 흐름 필요
- 인증번호 자체는 DB에 저장하지 않고 Node 메모리 등의 임시 저장소를 사용
- `verificationId`를 이용하여 전화번호 인증 절차를 식별
- 최종 회원가입 시 아이디 중복 여부와 전화번호 인증 완료 여부를 다시 검증


### 아이디 찾기
- 전화번호 인증 완료 후 해당 전화번호에 연결된 `login_id`를 반환
- 전화번호와 인증정보가 일치하지 않으면 아이디를 반환하지 않음
- 인증번호 오류 또는 만료 시 다음 단계 진행 불가


### 비밀번호 찾기 / 재설정
- 비밀번호 찾기는 사용자 식별 후 휴대폰 인증을 거쳐 진행
- `/api/auth/password/send` 요청 시 `loginId`와 `phone`을 동시에 전달하도록 변경
- 서버에서 `loginId + phone`이 동일 사용자 정보인지 확인한 뒤 인증번호를 발송
- 인증번호 오류 또는 만료 시 비밀번호 재설정 불가
- 인증 완료 후에만 새 비밀번호 설정 가능
- 새 비밀번호는 비밀번호 규칙을 다시 검증
- 새 비밀번호 / 비밀번호 확인 값이 다르면 변경 불가
- 비밀번호 변경 시 기존 `password_hash`를 새 bcrypt hash로 교체


### 프로필
- 일반 프로필 수정에서는 닉네임만 변경 가능
- 아이디 및 전화번호는 일반 프로필 수정 대상에서 제외


### 마이페이지
- 로그아웃 실행 전 확인 모달 표시
- 회원 탈퇴 실행 전 복구 불가 안내가 포함된 확인 모달 표시
- 러닝 기록 / 즐겨찾기 등의 하위 목록이 없을 경우 각 화면에서 Empty State 처리
- 마이페이지에 표시되는 요약 정보는 여러 API로 나누기보다 하나의 요약 API에서 집계하여 반환


### 회원 탈퇴
- users 행을 실제로 DELETE하지 않고 `WITHDRAWN` 상태로 변경
- `phone`은 NULL 처리
- `login_id`는 `withdraw_[idx]_[random]` 형태로 변경
- `password_hash`는 기존 비밀번호로 인증할 수 없는 값으로 교체
- `withdrawn_at`에 탈퇴 시각 기록
- 기존 러닝 기록 / 추천 기록 등의 FK 관계는 유지


### 러닝 기록
- 러닝 기록이 없는 경우 `"아직 저장된 러닝 기록이 없습니다."` 등의 Empty State 처리
- 추천 코스 거리와 사용자가 실제로 달린 거리를 구분
- 실제 러닝 거리는 `running_trackpoints`의 GPS 위치를 기반으로 계산한 뒤 `running_sessions.distance`에 집계하여 저장
- `COMPLETED`뿐 아니라 `STOPPED`, `FAILED` 세션도 기록으로 보존


### 페이스 분석
- 구간별 페이스는 `running_trackpoints.point`와 `recorded_at`을 기준으로 계산
- 모든 `running_sessions`를 읽고 집계하면 데이터가 너무 많기 때문에 가장 최근 종료된 러닝을 기준으로 계산
- 분석 가능한 러닝 기록이 부족한 경우 데이터 부족 상태를 처리

# 전체 흐름 요약

```text
회원
아이디 확인
→ 전화번호 인증
→ 회원가입
→ 로그인
→ JWT 발급

사용자
JWT
→ 프로필 조회/수정
→ 마이페이지 조회
→ 회원 탈퇴

러닝
route_recommendations
→ running_sessions 생성
→ running_trackpoints 지속 저장
→ 러닝 종료
→ 실제 거리 / 평균 페이스 계산
→ running_sessions 결과 저장

조회
running_sessions
→ 러닝 기록
→ 마이페이지 통계

분석
running_trackpoints
→ point + recorded_at
→ 거리/시간 계산
→ 구간별 평균 페이스
```