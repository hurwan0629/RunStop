# API 문서

API 문서는 **도메인별 폴더로 나누고, API 1개를 파일 1개로 관리합니다.**

## 도메인

- [auth](https://chatgpt.com/c/auth/README.md)
    
- [users](https://chatgpt.com/c/users/README.md)
    
- [running](https://chatgpt.com/c/running/README.md)
    
- [routes](https://chatgpt.com/c/routes/README.md)
    
- [goals](https://chatgpt.com/c/goals/README.md)
    
- [bookmarks](https://chatgpt.com/c/bookmarks/README.md)
    
- [inquiries](https://chatgpt.com/c/inquiries/README.md)
    

## API 문서 작성 순서

- 목적
    
- 엔드포인트
    
- 요청 스키마
    
- 응답 스키마
    
- 인증/권한
    
- 검사하는 내용
    
- 조회하는 상태
    
- 저장/변경하는 상태
    

## 상태 표기 규칙

- DB 상태는 `[테이블.컬럼]` 형태로 적습니다.
    
- 서버 메모리 객체나 외부 API 응답은 데이터 스키마와 예시를 함께 적습니다.
    
- 검사 실패나 권한 실패 응답 규칙이 공통 규칙을 따르는 경우, API 문서에서는 실패 응답보다 검사 기준을 우선 기록합니다.
    

# 작업 진행

## Auth

|API 기능 설명|API URL|제작 상태|검수 상태|비고|
|---|---|---|---|---|
|[로그인](https://chatgpt.com/c/auth/01_%EB%A1%9C%EA%B7%B8%EC%9D%B8.md)|[`POST /api/auth/login`](https://chatgpt.com/c/auth/01_%EB%A1%9C%EA%B7%B8%EC%9D%B8.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[회원가입 아이디 중복확인](https://chatgpt.com/c/auth/02_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_%EC%95%84%EC%9D%B4%EB%94%94_%EC%A4%91%EB%B3%B5%ED%99%95%EC%9D%B8.md)|[`POST /api/auth/check-login-id`](https://chatgpt.com/c/auth/02_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_%EC%95%84%EC%9D%B4%EB%94%94_%EC%A4%91%EB%B3%B5%ED%99%95%EC%9D%B8.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[회원가입 전화번호 인증번호 발송](https://chatgpt.com/c/auth/03_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EB%B0%9C%EC%86%A1.md)|[`POST /api/auth/phone/send`](https://chatgpt.com/c/auth/03_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EB%B0%9C%EC%86%A1.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[회원가입 전화번호 인증번호 검증](https://chatgpt.com/c/auth/04_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EA%B2%80%EC%A6%9D.md)|[`POST /api/auth/phone/verify`](https://chatgpt.com/c/auth/04_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EA%B2%80%EC%A6%9D.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[회원가입](https://chatgpt.com/c/auth/05_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85.md)|[`POST /api/auth/signup`](https://chatgpt.com/c/auth/05_%ED%9A%8C%EC%9B%90%EA%B0%80%EC%9E%85.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[아이디 찾기 전화번호 인증번호 발송](https://chatgpt.com/c/auth/06_%EC%95%84%EC%9D%B4%EB%94%94_%EC%B0%BE%EA%B8%B0_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EB%B0%9C%EC%86%A1.md)|[`POST /api/auth/find-id/phone/send`](https://chatgpt.com/c/auth/06_%EC%95%84%EC%9D%B4%EB%94%94_%EC%B0%BE%EA%B8%B0_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EB%B0%9C%EC%86%A1.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[아이디 찾기 전화번호 인증번호 검증](https://chatgpt.com/c/auth/07_%EC%95%84%EC%9D%B4%EB%94%94_%EC%B0%BE%EA%B8%B0_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EA%B2%80%EC%A6%9D.md)|[`POST /api/auth/find-id/phone/verify`](https://chatgpt.com/c/auth/07_%EC%95%84%EC%9D%B4%EB%94%94_%EC%B0%BE%EA%B8%B0_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EA%B2%80%EC%A6%9D.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[비밀번호 재설정 전화번호 인증번호 발송](https://chatgpt.com/c/auth/08_%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8_%EC%9E%AC%EC%84%A4%EC%A0%95_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EB%B0%9C%EC%86%A1.md)|[`POST /api/auth/password/phone/send`](https://chatgpt.com/c/auth/08_%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8_%EC%9E%AC%EC%84%A4%EC%A0%95_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EB%B0%9C%EC%86%A1.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[비밀번호 재설정 전화번호 인증번호 검증](https://chatgpt.com/c/auth/09_%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8_%EC%9E%AC%EC%84%A4%EC%A0%95_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EA%B2%80%EC%A6%9D.md)|[`POST /api/auth/password/phone/verify`](https://chatgpt.com/c/auth/09_%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8_%EC%9E%AC%EC%84%A4%EC%A0%95_%EC%A0%84%ED%99%94%EB%B2%88%ED%98%B8_%EC%9D%B8%EC%A6%9D%EB%B2%88%ED%98%B8_%EA%B2%80%EC%A6%9D.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||
|[비밀번호 재설정](https://chatgpt.com/c/auth/10_%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8_%EC%9E%AC%EC%84%A4%EC%A0%95.md)|[`POST /api/auth/password/reset`](https://chatgpt.com/c/auth/10_%EB%B9%84%EB%B0%80%EB%B2%88%ED%98%B8_%EC%9E%AC%EC%84%A4%EC%A0%95.md)|2026-09-01 제작 완료|2026-09-01 검수 완료||

## Users

|API 기능 설명|API URL|제작 상태|검수 상태|비고|
|---|---|---|---|---|
|[마이페이지 조회](https://chatgpt.com/c/users/01_%EB%A7%88%EC%9D%B4%ED%8E%98%EC%9D%B4%EC%A7%80_%EC%A1%B0%ED%9A%8C.md)|[`GET /api/users/me/mypage`](https://chatgpt.com/c/users/01_%EB%A7%88%EC%9D%B4%ED%8E%98%EC%9D%B4%EC%A7%80_%EC%A1%B0%ED%9A%8C.md)|2026-09-02 제작 완료|2026-09-02 12:43:53 검수 완료||
|[내 정보 수정](https://chatgpt.com/c/users/02_%EB%82%B4_%EC%A0%95%EB%B3%B4_%EC%88%98%EC%A0%95.md)|[`PATCH /api/users/me`](https://chatgpt.com/c/users/02_%EB%82%B4_%EC%A0%95%EB%B3%B4_%EC%88%98%EC%A0%95.md)|2026-09-02 제작 완료|2026-09-02 14:02:50 검수 완료|테이블 작업 후 `runningSettings` 최종 작성 필요|
|[회원탈퇴](https://chatgpt.com/c/users/03_%ED%9A%8C%EC%9B%90%ED%83%88%ED%87%B4.md)|[`DELETE /api/users/me`](https://chatgpt.com/c/users/03_%ED%9A%8C%EC%9B%90%ED%83%88%ED%87%B4.md)|2026-09-02 제작 완료|2026-09-02 14:04:12 검수 완료||

## Running

|API 기능 설명|API URL|제작 상태|검수 상태|비고|
|---|---|---|---|---|
|[러닝 세션 목록](https://chatgpt.com/c/running/01_%EB%9F%AC%EB%8B%9D_%EC%84%B8%EC%85%98_%EB%AA%A9%EB%A1%9D.md)|[`GET /api/running-sessions`](https://chatgpt.com/c/running/01_%EB%9F%AC%EB%8B%9D_%EC%84%B8%EC%85%98_%EB%AA%A9%EB%A1%9D.md)|2026-09-02 제작 완료|2026-09-02 14:47:07 검수 완료||
|[러닝 시작](https://chatgpt.com/c/running/02_%EB%9F%AC%EB%8B%9D_%EC%8B%9C%EC%9E%91.md)|[`POST /api/running-sessions`](https://chatgpt.com/c/running/02_%EB%9F%AC%EB%8B%9D_%EC%8B%9C%EC%9E%91.md)|2026-09-02 제작 완료|2026-09-02 14:55:55 검수 완료||
|[트랙포인트 저장](https://chatgpt.com/c/running/03_%ED%8A%B8%EB%9E%99%ED%8F%AC%EC%9D%B8%ED%8A%B8_%EC%A0%80%EC%9E%A5.md)|[`POST /api/running-sessions/:sessionIdx/trackpoints`](https://chatgpt.com/c/running/03_%ED%8A%B8%EB%9E%99%ED%8F%AC%EC%9D%B8%ED%8A%B8_%EC%A0%80%EC%9E%A5.md)|2026-09-02 제작 완료|2026-09-02 15:15:19 검수 완료||
|[러닝 종료](https://chatgpt.com/c/running/04_%EB%9F%AC%EB%8B%9D_%EC%A2%85%EB%A3%8C.md)|[`POST /api/running-sessions/:sessionIdx/finish`](https://chatgpt.com/c/running/04_%EB%9F%AC%EB%8B%9D_%EC%A2%85%EB%A3%8C.md)|2026-09-02 제작 완료|2026-09-02 15:43:59 검수 완료||
|[페이스 조회](https://chatgpt.com/c/running/05_%ED%8E%98%EC%9D%B4%EC%8A%A4_%EC%A1%B0%ED%9A%8C.md)|[`GET /api/running-sessions/:sessionIdx/pace`](https://chatgpt.com/c/running/05_%ED%8E%98%EC%9D%B4%EC%8A%A4_%EC%A1%B0%ED%9A%8C.md)|2026-09-02 제작 완료|2026-09-02 15:48:25 검수 완료|구간별 페이스 함수는 추후 한 번 복기할 요소|

## Routes

| API 기능 설명                                                                                               | API URL                                                                                                                              | 제작 상태            | 검수 상태                     | 비고                                                                                                                             |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [코스 추천](https://chatgpt.com/c/routes/01_%EC%BD%94%EC%8A%A4_%EC%B6%94%EC%B2%9C.md)                       | [`POST /api/routes/recommend`](https://chatgpt.com/c/routes/01_%EC%BD%94%EC%8A%A4_%EC%B6%94%EC%B2%9C.md)                             | 2026-09-02 제작 완료 | 2026-09-02 20:09:48 검수 완료 | `startPoint + waypoints + endPoint` 구조. `endPoint` 생략 시 왕복형. `elementConditions`는 Python Worker 계약 확정 시 변경 가능                  |
| [추천 코스 선택](https://chatgpt.com/c/routes/02_%EC%B6%94%EC%B2%9C_%EC%BD%94%EC%8A%A4_%EC%84%A0%ED%83%9D.md) | [`POST /api/routes/:requestIdx/select`](https://chatgpt.com/c/routes/02_%EC%B6%94%EC%B2%9C_%EC%BD%94%EC%8A%A4_%EC%84%A0%ED%83%9D.md) | 2026-09-02 제작 완료 | 2026-09-02 20:54:56 검수 완료 | 상세 조회 후 러닝 시작 시 `select` 호출 후 `POST /api/running-sessions`를 호출합니다. 추후 여유가 있으면 러닝 시작 API에서 선택까지 처리하거나 선택+시작 통합 API를 추가할 수 있습니다. |
| [코스 상세 조회](https://chatgpt.com/c/routes/03_%EC%BD%94%EC%8A%A4_%EC%83%81%EC%84%B8_%EC%A1%B0%ED%9A%8C.md) | [`GET /api/routes/:routeIdx`](https://chatgpt.com/c/routes/03_%EC%BD%94%EC%8A%A4_%EC%83%81%EC%84%B8_%EC%A1%B0%ED%9A%8C.md)           | 2026-09-02 제작 완료 | 2026-09-02 21:07:26 검수 완료 | `path`는 전체 LineString, `points`는 주요 지점                                                                                         |

## Goals

| API 기능 설명                                                                                              | API URL                                                                                                                | 제작 상태            | 검수 상태                   | 비고                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------- | ----------------------- | ------------------------------------------------------------------------------------ |
| [현재 목표 조회](https://chatgpt.com/c/goals/01_%ED%98%84%EC%9E%AC_%EB%AA%A9%ED%91%9C_%EC%A1%B0%ED%9A%8C.md) | [`GET /api/goals/current`](https://chatgpt.com/c/goals/01_%ED%98%84%EC%9E%AC_%EB%AA%A9%ED%91%9C_%EC%A1%B0%ED%9A%8C.md) | 2026-09-02 제작 완료 | 2026-09-02 typecheck 통과, 직접 확인 필요 | 현재 자동 목표 상태 업데이트는 없으며 `goals.service.ts`의 `refreshExpiredGoals` 을 통한 Lazy Update 사용중 |
| [목표 생성](https://chatgpt.com/c/goals/02_%EB%AA%A9%ED%91%9C_%EC%83%9D%EC%84%B1.md)                       | [`POST /api/goals`](https://chatgpt.com/c/goals/02_%EB%AA%A9%ED%91%9C_%EC%83%9D%EC%84%B1.md)                           | 2026-09-02 제작 완료 | 2026-09-02 typecheck 통과, 직접 확인 필요 | 사용자당 `ACTIVE` 목표 1개. 추후 partial unique index 추가 시 service 중복 방어는 보조 역할로 축소           |
| [목표 중지](https://chatgpt.com/c/goals/03_%EB%AA%A9%ED%91%9C_%EC%A4%91%EC%A7%80.md)                       | [`POST /api/goals/:goalIdx/stop`](https://chatgpt.com/c/goals/03_%EB%AA%A9%ED%91%9C_%EC%A4%91%EC%A7%80.md)             | 2026-09-02 제작 완료 | 2026-09-02 typecheck 통과, 직접 확인 필요 | 만료 갱신 후에도 `ACTIVE`인 목표만 `STOPPED` 처리. 추후 상태 변경 이력 테이블 추가 가능                          |

## Bookmarks

|API 기능 설명|API URL|제작 상태|검수 상태|비고|
|---|---|---|---|---|
|[장소 즐겨찾기 목록](https://chatgpt.com/c/bookmarks/01_%EC%9E%A5%EC%86%8C_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EB%AA%A9%EB%A1%9D.md)|[`GET /api/bookmarks/points`](https://chatgpt.com/c/bookmarks/01_%EC%9E%A5%EC%86%8C_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EB%AA%A9%EB%A1%9D.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요||
|[장소 즐겨찾기 생성](https://chatgpt.com/c/bookmarks/02_%EC%9E%A5%EC%86%8C_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%83%9D%EC%84%B1.md)|[`POST /api/bookmarks/points`](https://chatgpt.com/c/bookmarks/02_%EC%9E%A5%EC%86%8C_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%83%9D%EC%84%B1.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요|장소 중복은 현재 DB 제약이 없어 허용|
|[장소 즐겨찾기 삭제](https://chatgpt.com/c/bookmarks/03_%EC%9E%A5%EC%86%8C_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%82%AD%EC%A0%9C.md)|[`DELETE /api/bookmarks/points/:bookmarkIdx`](https://chatgpt.com/c/bookmarks/03_%EC%9E%A5%EC%86%8C_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%82%AD%EC%A0%9C.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요||
|[코스 즐겨찾기 목록](https://chatgpt.com/c/bookmarks/04_%EC%BD%94%EC%8A%A4_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EB%AA%A9%EB%A1%9D.md)|[`GET /api/bookmarks/routes`](https://chatgpt.com/c/bookmarks/04_%EC%BD%94%EC%8A%A4_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EB%AA%A9%EB%A1%9D.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요||
|[코스 즐겨찾기 생성](https://chatgpt.com/c/bookmarks/05_%EC%BD%94%EC%8A%A4_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%83%9D%EC%84%B1.md)|[`POST /api/bookmarks/routes`](https://chatgpt.com/c/bookmarks/05_%EC%BD%94%EC%8A%A4_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%83%9D%EC%84%B1.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요|DB unique 제약으로 중복 방지|
|[코스 즐겨찾기 삭제](https://chatgpt.com/c/bookmarks/06_%EC%BD%94%EC%8A%A4_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%82%AD%EC%A0%9C.md)|[`DELETE /api/bookmarks/routes/:bookmarkIdx`](https://chatgpt.com/c/bookmarks/06_%EC%BD%94%EC%8A%A4_%EC%A6%90%EA%B2%A8%EC%B0%BE%EA%B8%B0_%EC%82%AD%EC%A0%9C.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요||

## Inquiries

|API 기능 설명|API URL|제작 상태|검수 상태|비고|
|---|---|---|---|---|
|[문의 목록](https://chatgpt.com/c/inquiries/01_%EB%AC%B8%EC%9D%98_%EB%AA%A9%EB%A1%9D.md)|[`GET /api/inquiries`](https://chatgpt.com/c/inquiries/01_%EB%AC%B8%EC%9D%98_%EB%AA%A9%EB%A1%9D.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요|일반 사용자는 본인 문의만, 관리자는 전체 조회|
|[문의 생성](https://chatgpt.com/c/inquiries/02_%EB%AC%B8%EC%9D%98_%EC%83%9D%EC%84%B1.md)|[`POST /api/inquiries`](https://chatgpt.com/c/inquiries/02_%EB%AC%B8%EC%9D%98_%EC%83%9D%EC%84%B1.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요||
|[문의 상세 조회](https://chatgpt.com/c/inquiries/03_%EB%AC%B8%EC%9D%98_%EC%83%81%EC%84%B8_%EC%A1%B0%ED%9A%8C.md)|[`GET /api/inquiries/:inquiryIdx`](https://chatgpt.com/c/inquiries/03_%EB%AC%B8%EC%9D%98_%EC%83%81%EC%84%B8_%EC%A1%B0%ED%9A%8C.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요|작성자 본인 또는 관리자만 조회|
|[문의 상태 변경](https://chatgpt.com/c/inquiries/04_%EB%AC%B8%EC%9D%98_%EC%83%81%ED%83%9C_%EB%B3%80%EA%B2%BD.md)|[`PATCH /api/inquiries/:inquiryIdx/status`](https://chatgpt.com/c/inquiries/04_%EB%AC%B8%EC%9D%98_%EC%83%81%ED%83%9C_%EB%B3%80%EA%B2%BD.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요|관리자만 가능. 상태 enum은 `PENDING`, `IN_PROGRESS`, `ANSWERED`|
|[문의 답변](https://chatgpt.com/c/inquiries/05_%EB%AC%B8%EC%9D%98_%EB%8B%B5%EB%B3%80.md)|[`POST /api/inquiries/:inquiryIdx/answer`](https://chatgpt.com/c/inquiries/05_%EB%AC%B8%EC%9D%98_%EB%8B%B5%EB%B3%80.md)|2026-09-02 제작 완료|2026-09-02 typecheck 통과, 직접 확인 필요|답변 저장 시 `ANSWERED` 처리, 재답변 불가|
