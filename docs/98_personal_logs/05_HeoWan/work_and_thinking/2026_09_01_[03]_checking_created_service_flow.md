# 최종 서비스 구조 확인하기
> 최종 서비스 구조를 한번 검토하려 합니다.

## 1. 회원가입
1. 회원가입 요청을 합니다. `/api/auth/check-login-id`에서 아이디를 보내어 단순하게 형식 및 중복 조회를 합니다. 인증은 필요 없습니다.
2. 전화번호 인증번호를 요청합니다. `POST /api/auth/phone/send`를 이용하여 sms 인증번호를 보내며 `phone: 전화번호` 를 함께 보내어 전화번호 중복검사, 랜덤 인증번호를 생성하여 sms를 발송하며 서버 메모리에 Timer을 등록해줍니다.
3. `POST /api/auth/phone/verify`를 이용하여 내부에 클라이언트에서 `verificationId`와 함께 `code`를 발송하여 `verified` 상태를 받아서 서버쪽에서 인증이 성공하였는지를 판단합니다. 인증번호의 유효식간은 10분으로 설정할 예정입니다.
4. 최종적으로 `verificationId`와 함께 회원가입 요청을 하며 서버쪽에서는 해당 사용자 전화번호 인증 상태를 확인하고 허가를 해주거나 반려를 해줍니다.

## 2. 아이디 찾기
1. 전화번호 인증 요청을 이용하여 사용자 상태를 업데이트 해줍니다. 여기에서도 서버메모리에 상태를 3분간 저장하고 로드를 시켜줍니다.
2. 인증번호와 verificationId를 받아서 서버에서 사용자의 아이디를 조회하여 반환받습니다.

## 3. 비밀번호 재설정
1. `POST /api/auth/password/phone/send`를 이용해서 해당 아이디와 전화번호를 검증하고 전화번호에 인증번호를 보냅니다. 또한 password 세션으로 전화번호와 아이디를 3분간 사용 가능하게 verified: true로 변경해줍니다.
2. `POST /api/auth/password/phone/verify`를 이용하여 인증을 합니다. 이후 password 변경은 10분간 늘어납니다.
3. `POST /api/auth/password/phone/reset`를 이용하여 비밀번호를 업데이트 해줍니다. 서버쪽 메모리에 해당 사용자 verificationId를 키로 한 verified=true인 키가 없으면 업데이트를 실패로 처리해줍니다.

## 4. 로그인
1. `POST /api/auth/login`을 이용하여 `loginId`와 `password`를 요청에 답아서 요청하며 응답으로는 `<jwttoken>` 문자열을 응답합니다.

> 이후 React Native 요청의 `Authorization` 헤더에는 `Bearer <JWTToken>` 문자열을 넣어서 응답하게 해줍니다.

## 5. 로그아웃
로그아웃은 구현되지 않았습니다. (서버쪽) 프론트에서 토큰 삭제하면 끝입니다.

## 6. 프로필 수정
`PATCH /api/users/me`를 이용하여 `Authorization` 헤더만 보내주면 사용자(클라이언트)의 요청에 있는 `nickname`으로 검수 후 닉네임을 업데이트 해줍니다.

## 7. 회원 탈퇴
사용자가 `DELETE /api/users/me`를 `Authorization` 헤더와 함께 보내주게 된다면 서버에서는 JWT 사용자를 확인한 뒤에 phone, login_id, password 등을 모두 삭제해주게 됩니다.

## 8. 마이페이지 조회
`DELETE /api/users/me`를 하면 `Authorization` 헤더를 본다음에 `GET /api/users/me/mypage`를 통해 `Authorization` 을 이용해서 사용자 기본 정보와 `user.exp`, `goal.targetDistance`, `goal.type`, `running.totalCount`, `running.Distance` 등을 집계하여 반환합니다.

## 9. 러닝 기록 조회
`GET /api/running-sessions`을 호출과 함께 서버쪽에서 `Authorization` 헤더를 확인한 후 사용자라면 맨 상단에 출력될 `totalDistance`에 미터와 `totalCount`, 등과 같은 러닝 기록 목록에 출력될 내용을 줍니다.

`items[i].status`에는 `IN_PROGRESS`, `COMPLETED`, `STOPPED`, `FAILED`가 들어갈 수 있습니다.

## 10. 러닝 세션
러닝세션은 시작될 때 기록을 시작하며 지속적으로 저장되는 방식을 사용합니다.

