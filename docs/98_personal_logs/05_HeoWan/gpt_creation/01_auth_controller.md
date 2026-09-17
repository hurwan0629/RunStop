# AuthController 구현 방향

## 담당 범위

인증 관련 흐름을 담당한다.

- 로그인
- 회원가입
- 회원가입용 전화번호 인증
- 아이디 찾기
- 비밀번호 재설정

현재 로그아웃은 Stateless JWT 기준으로 서버 API를 두지 않는다.

## 관련 파일

```text
backend/src/routes/auth.routes.ts
backend/src/controllers/auth.controller.ts
backend/src/services/auth.service.ts
backend/src/services/phone-verification.service.ts
backend/src/repositories/users.repository.ts
backend/src/repositories/user-profiles.repository.ts
backend/src/adapters/sms/sms.client.ts
```

## API 명세

### 로그인

`POST /api/auth/login`

Request:

```json
{
  "loginId": "hurwan0629",
  "password": "password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "user": {
      "idx": 15,
      "nickname": "허완",
      "role": "USER"
    }
  }
}
```

흐름:

```text
controller
→ loginSchema 검증
→ authService.loginUser
→ usersRepository.findUserByLoginId
→ status 확인
→ bcrypt password 비교
→ usersRepository.updateLastLoginAt
→ JWT 생성
→ 응답
```

주의:

- `WITHDRAWN` 사용자는 로그인 실패 처리한다.
- `SUSPENDED` 사용자는 `suspended_until`을 확인한다.
- 정지 만료 시간이 지났다면 로그인 시점에 해제할지, 관리자 작업에서만 해제할지 정책을 정해야 한다.

### 아이디 중복 확인

`POST /api/auth/check-login-id`

Request:

```json
{
  "loginId": "hurwan0629"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "available": true
  }
}
```

흐름:

```text
controller
→ loginId 형식 검증
→ authService.checkLoginIdAvailability
→ usersRepository.findUserByLoginId
→ available 반환
```

최종 회원가입 시 DB `UNIQUE` 제약을 다시 믿어야 한다. 중복 확인 이후 다른 사용자가 같은 아이디로 가입할 수 있기 때문이다.

### 회원가입용 인증번호 발송

`POST /api/auth/phone/send`

Request:

```json
{
  "phone": "01012345678"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verificationId": "uuid",
    "expiresInSec": 180
  }
}
```

흐름:

```text
controller
→ phone 형식 검증
→ usersRepository.findUserByPhone
→ 이미 사용 중인 phone인지 확인
→ phoneVerificationService.sendPhoneVerification({ purpose: "SIGNUP" })
→ smsAdapter.sendVerificationSms
→ verificationId 반환
```

인증번호 저장:

```text
phone-verification.service.ts 내부 Map
key: verificationId
value: purpose, phone, codeHash, expiresAt, verified, attemptCount
```

회원가입 인증은 `purpose = SIGNUP`으로 저장한다. 아이디 찾기/비밀번호 재설정 인증과 절대 공유하지 않는다.

### 회원가입용 인증번호 검증

`POST /api/auth/phone/verify`

Request:

```json
{
  "verificationId": "uuid",
  "code": "123456"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

흐름:

```text
controller
→ verificationId/code 검증
→ phoneVerificationService.verifyPhoneCode({ purpose: "SIGNUP" })
→ expiresAt 확인
→ codeHash 비교
→ verified = true
→ verifiedUntil 설정
```

### 최종 회원가입

`POST /api/auth/signup`

Request:

```json
{
  "loginId": "hurwan0629",
  "password": "password",
  "nickname": "허완",
  "phone": "01012345678",
  "verificationId": "uuid",
  "profile": {
    "weightKg": 70,
    "heightCm": 175
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "<JWT>",
    "user": {
      "idx": 15,
      "nickname": "허완",
      "role": "USER"
    }
  }
}
```

흐름:

```text
controller
→ signupSchema 검증
→ authService.signupUser
→ verificationId 조회
→ purpose = SIGNUP 확인
→ verified = true 확인
→ 인증된 phone과 request.phone 일치 확인
→ loginId 중복 최종 확인
→ bcrypt password hash
→ transaction 시작
→ users INSERT
→ user_profiles INSERT
→ transaction commit
→ verificationId consume
→ JWT 생성
→ 응답
```

프로필 이미지는 사용자가 직접 보내는 값보다 서버가 기본 이미지 중 하나를 부여하는 방향이 문서 흐름과 맞다.

### 아이디 찾기 인증번호 발송

`POST /api/auth/find-id/phone/send`

Request:

```json
{
  "phone": "01012345678"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verificationId": "uuid",
    "expiresInSec": 180
  }
}
```

흐름:

```text
controller
→ phone 검증
→ usersRepository.findUserByPhone
→ 가입된 phone인지 확인
→ phoneVerificationService.sendPhoneVerification({ purpose: "FIND_ID" })
→ SMS 발송
```

가입된 전화번호가 아니어도 보안상 같은 응답을 줄지, `404`를 줄지는 결정이 필요하다. 단기 프로젝트에서는 구현 단순성을 위해 `404`도 가능하다.

### 아이디 찾기 인증번호 검증

`POST /api/auth/find-id/phone/verify`

Request:

```json
{
  "verificationId": "uuid",
  "code": "123456"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "loginId": "hurwan0629"
  }
}
```

흐름:

```text
controller
→ phoneVerificationService.verifyPhoneCode({ purpose: "FIND_ID" })
→ 인증된 phone 확인
→ usersRepository.findUserByPhone
→ login_id 반환
→ verificationId consume
```

### 비밀번호 재설정용 인증번호 발송

`POST /api/auth/password/phone/send`

Request:

```json
{
  "loginId": "hurwan0629",
  "phone": "01012345678"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verificationId": "uuid",
    "expiresInSec": 180
  }
}
```

흐름:

```text
controller
→ loginId/phone 검증
→ usersRepository.findUserByLoginId
→ user.phone과 request.phone 일치 확인
→ phoneVerificationService.sendPhoneVerification({ purpose: "RESET_PASSWORD", loginId, phone })
→ SMS 발송
```

이 흐름에서는 별도 `/api/auth/password/check-login-id`를 두지 않는다. `loginId + phone` 검증을 `phone/send`에서 같이 처리한다.

### 비밀번호 재설정용 인증번호 검증

`POST /api/auth/password/phone/verify`

Request:

```json
{
  "verificationId": "uuid",
  "code": "123456"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "verified": true
  }
}
```

흐름:

```text
controller
→ phoneVerificationService.verifyPhoneCode({ purpose: "RESET_PASSWORD" })
→ verified = true
→ verifiedUntil을 인증번호 만료보다 조금 길게 설정
```

예:

- 인증번호 입력 제한: 3분
- 비밀번호 재설정 가능 시간: 인증 성공 후 10분

### 비밀번호 재설정

`POST /api/auth/password/reset`

Request:

```json
{
  "verificationId": "uuid",
  "newPassword": "new-password"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "updated": true
  }
}
```

흐름:

```text
controller
→ newPassword 규칙 검증
→ verificationId 조회
→ purpose = RESET_PASSWORD 확인
→ verified = true 확인
→ verifiedUntil 확인
→ verification.loginId로 user 조회
→ bcrypt 새 password hash
→ users.password_hash UPDATE
→ verificationId consume
```

## 에러 방향

| 상황 | 권장 코드 |
|---|---|
| 요청 형식 오류 | `INVALID_REQUEST` |
| 아이디/비밀번호 불일치 | `INVALID_CREDENTIALS` |
| 중복 아이디 | `LOGIN_ID_ALREADY_EXISTS` |
| 중복 전화번호 | `PHONE_ALREADY_EXISTS` |
| 인증번호 만료 | `VERIFICATION_EXPIRED` |
| 인증번호 불일치 | `VERIFICATION_CODE_MISMATCH` |
| 인증 목적 불일치 | `INVALID_VERIFICATION_PURPOSE` |
| 탈퇴 계정 | `WITHDRAWN_USER` |
| 정지 계정 | `SUSPENDED_USER` |

## 구현 시 우선순위

1. DTO 검증
2. 전화번호 인증 Map 구현
3. 회원가입 transaction
4. 로그인 JWT 발급
5. 아이디 찾기와 비밀번호 재설정
6. SMS adapter 실제 연동 또는 mock adapter
