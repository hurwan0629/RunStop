# API 설계

API 문서는 도메인별 폴더로 나누고, API 1개를 파일 1개로 관리합니다.

## 도메인

- [auth](./auth/README.md)
- [users](./users/README.md)
- [running](./running/README.md)
- [routes](./routes/README.md)
- [goals](./goals/README.md)
- [bookmarks](./bookmarks/README.md)
- [inquiries](./inquiries/README.md)

## API 문서 작성 틀

- 목적
- 엔드포인트
- 요청 스키마
- 응답 스키마
- 인증/인가
- 검사하는 내용
- 조회하는 상태
- 저장/변경하는 상태

## 상태 표기 규칙

- DB 상태는 `[테이블.컬럼]` 형태로 적습니다.
- 서버 메모리 객체나 외부 API 응답은 데이터 스키마와 예시를 함께 적습니다.
- 검사 실패는 전역 실패 응답 규칙을 따르며, API 문서에서는 실패 응답보다 검사 기준을 우선 기록합니다.

## 작업 진행

### Auth

| api 짧은 설명 | api url | 제작 상태 | 검수 상태 |
| --- | --- | --- | --- |
| [로그인](./auth/01_로그인.md) | [`POST /api/auth/login`](./auth/01_로그인.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [회원가입 아이디 중복확인](./auth/02_회원가입_아이디_중복확인.md) | [`POST /api/auth/check-login-id`](./auth/02_회원가입_아이디_중복확인.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [회원가입 전화번호 인증번호 발송](./auth/03_회원가입_전화번호_인증번호_발송.md) | [`POST /api/auth/phone/send`](./auth/03_회원가입_전화번호_인증번호_발송.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [회원가입 전화번호 인증번호 검증](./auth/04_회원가입_전화번호_인증번호_검증.md) | [`POST /api/auth/phone/verify`](./auth/04_회원가입_전화번호_인증번호_검증.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [회원가입](./auth/05_회원가입.md) | [`POST /api/auth/signup`](./auth/05_회원가입.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [아이디 찾기 전화번호 인증번호 발송](./auth/06_아이디_찾기_전화번호_인증번호_발송.md) | [`POST /api/auth/find-id/phone/send`](./auth/06_아이디_찾기_전화번호_인증번호_발송.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [아이디 찾기 전화번호 인증번호 검증](./auth/07_아이디_찾기_전화번호_인증번호_검증.md) | [`POST /api/auth/find-id/phone/verify`](./auth/07_아이디_찾기_전화번호_인증번호_검증.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [비밀번호 재설정 전화번호 인증번호 발송](./auth/08_비밀번호_재설정_전화번호_인증번호_발송.md) | [`POST /api/auth/password/phone/send`](./auth/08_비밀번호_재설정_전화번호_인증번호_발송.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [비밀번호 재설정 전화번호 인증번호 검증](./auth/09_비밀번호_재설정_전화번호_인증번호_검증.md) | [`POST /api/auth/password/phone/verify`](./auth/09_비밀번호_재설정_전화번호_인증번호_검증.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |
| [비밀번호 재설정](./auth/10_비밀번호_재설정.md) | [`POST /api/auth/password/reset`](./auth/10_비밀번호_재설정.md) | 2026-09-01 제작 완료 | 2026-09-01 검수 완료 |

### Users

| api 짧은 설명                          | api url                                              | 제작 상태            | 검수 상태                                                         |
| ---------------------------------- | ---------------------------------------------------- | ---------------- | ------------------------------------------------------------- |
| [내 페이지 조회](./users/01_내_페이지_조회.md) | [`GET /api/users/me/mypage`](./users/01_내_페이지_조회.md) | 2026-09-02 제작 완료 | 2026-09-02 12:43:53 검수 완료                                     |
| [내 정보 수정](./users/02_내_정보_수정.md)   | [`PATCH /api/users/me`](./users/02_내_정보_수정.md)       | 2026-09-02 제작 완료 | 2026-09-02 14:02:50 검수 완료 (파이썬 작업 후 runningSettings 최종 작성 필요) |
| [회원탈퇴](./users/03_회원탈퇴.md)         | [`DELETE /api/users/me`](./users/03_회원탈퇴.md)         | 2026-09-02 제작 완료 | 2026-09-02 14:04:12 검수 완료                                     |

### Running

| api 짧은 설명 | api url | 제작 상태 | 검수 상태 |
| --- | --- | --- | --- |
| [러닝 세션 목록](./running/01_러닝_세션_목록.md) | [`GET /api/running-sessions`](./running/01_러닝_세션_목록.md) |  |  |
| [러닝 시작](./running/02_러닝_시작.md) | [`POST /api/running-sessions/start`](./running/02_러닝_시작.md) |  |  |
| [트랙포인트 저장](./running/03_트랙포인트_저장.md) | [`POST /api/running-sessions/trackpoints`](./running/03_트랙포인트_저장.md) |  |  |
| [러닝 종료](./running/04_러닝_종료.md) | [`POST /api/running-sessions/finish`](./running/04_러닝_종료.md) |  |  |
| [페이스 조회](./running/05_페이스_조회.md) | [`GET /api/running-sessions/:sessionIdx/pace`](./running/05_페이스_조회.md) |  |  |

### Routes

| api 짧은 설명 | api url | 제작 상태 | 검수 상태 |
| --- | --- | --- | --- |
| [코스 추천](./routes/01_코스_추천.md) | [`POST /api/routes/recommend`](./routes/01_코스_추천.md) |  |  |
| [추천 코스 선택](./routes/02_추천_코스_선택.md) | [`POST /api/routes/:requestIdx/select`](./routes/02_추천_코스_선택.md) |  |  |
| [코스 상세 조회](./routes/03_코스_상세_조회.md) | [`GET /api/routes/:routeIdx`](./routes/03_코스_상세_조회.md) |  |  |

### Goals

| api 짧은 설명 | api url | 제작 상태 | 검수 상태 |
| --- | --- | --- | --- |
| [현재 목표 조회](./goals/01_현재_목표_조회.md) | [`GET /api/goals/current`](./goals/01_현재_목표_조회.md) |  |  |
| [목표 생성](./goals/02_목표_생성.md) | [`POST /api/goals`](./goals/02_목표_생성.md) |  |  |
| [목표 중지](./goals/03_목표_중지.md) | [`POST /api/goals/:goalIdx/stop`](./goals/03_목표_중지.md) |  |  |

### Bookmarks

| api 짧은 설명 | api url | 제작 상태 | 검수 상태 |
| --- | --- | --- | --- |
| [장소 즐겨찾기 목록](./bookmarks/01_장소_즐겨찾기_목록.md) | [`GET /api/bookmarks/points`](./bookmarks/01_장소_즐겨찾기_목록.md) |  |  |
| [장소 즐겨찾기 생성](./bookmarks/02_장소_즐겨찾기_생성.md) | [`POST /api/bookmarks/points`](./bookmarks/02_장소_즐겨찾기_생성.md) |  |  |
| [장소 즐겨찾기 삭제](./bookmarks/03_장소_즐겨찾기_삭제.md) | [`DELETE /api/bookmarks/points/:bookmarkIdx`](./bookmarks/03_장소_즐겨찾기_삭제.md) |  |  |
| [코스 즐겨찾기 목록](./bookmarks/04_코스_즐겨찾기_목록.md) | [`GET /api/bookmarks/routes`](./bookmarks/04_코스_즐겨찾기_목록.md) |  |  |
| [코스 즐겨찾기 생성](./bookmarks/05_코스_즐겨찾기_생성.md) | [`POST /api/bookmarks/routes`](./bookmarks/05_코스_즐겨찾기_생성.md) |  |  |
| [코스 즐겨찾기 삭제](./bookmarks/06_코스_즐겨찾기_삭제.md) | [`DELETE /api/bookmarks/routes/:bookmarkIdx`](./bookmarks/06_코스_즐겨찾기_삭제.md) |  |  |

### Inquiries

| api 짧은 설명 | api url | 제작 상태 | 검수 상태 |
| --- | --- | --- | --- |
| [문의 목록](./inquiries/01_문의_목록.md) | [`GET /api/inquiries`](./inquiries/01_문의_목록.md) |  |  |
| [문의 생성](./inquiries/02_문의_생성.md) | [`POST /api/inquiries`](./inquiries/02_문의_생성.md) |  |  |
| [문의 상세 조회](./inquiries/03_문의_상세_조회.md) | [`GET /api/inquiries/:inquiryIdx`](./inquiries/03_문의_상세_조회.md) |  |  |
| [문의 상태 변경](./inquiries/04_문의_상태_변경.md) | [`PATCH /api/inquiries/:inquiryIdx/status`](./inquiries/04_문의_상태_변경.md) |  |  |
| [문의 답변](./inquiries/05_문의_답변.md) | [`POST /api/inquiries/:inquiryIdx/answer`](./inquiries/05_문의_답변.md) |  |  |
