# RunStop Node Controller 구현 방향 Index

> 기준 문서: `docs/98_personal_logs/05_HeoWan/work_and_thinking/2026_09_01_[02]_service_flow_reshape.md`
>
> 목적: 실제 코드를 작성하기 전에 각 controller가 어떤 요청을 받고, 어떤 service/repository/adapter와 연결될지 상상할 수 있도록 흐름별 구현 방향을 정리한다.

## 전체 구조 기준

현재 Node 서버는 다음 계층으로 나누는 방향이 적절하다.

```text
routes
→ controllers
→ services
→ repositories / adapters
→ database / external API / routing-worker
```

- `routes`: URL, HTTP method, 미들웨어 연결
- `controllers`: 요청 값 추출, DTO 검증 결과 사용, service 호출, 응답 형식 조립
- `services`: 실제 서비스 규칙과 트랜잭션 흐름
- `repositories`: PostgreSQL/PostGIS 접근
- `adapters`: SMS, TMAP, LLM, Python routing-worker 등 외부/내부 연동

## 문서 목록

| Controller | 문서 | 담당 흐름 |
|---|---|---|
| AuthController | [01_auth_controller.md](./01_auth_controller.md) | 로그인, 회원가입, 전화번호 인증, 아이디 찾기, 비밀번호 재설정 |
| UsersController | [02_users_controller.md](./02_users_controller.md) | 마이페이지, 프로필 수정, 회원 탈퇴 |
| RoutesController | [03_routes_controller.md](./03_routes_controller.md) | 코스 추천 요청, 추천 후보 저장, 추천 선택, 코스 상세 |
| RunningController | [04_running_controller.md](./04_running_controller.md) | 러닝 시작, GPS 저장, 러닝 종료, 러닝 기록, 페이스 분석 |
| GoalsController | [05_goals_controller.md](./05_goals_controller.md) | 주간/월간 러닝 목표 조회, 생성, 중지, 만료 처리 |
| BookmarksController | [06_bookmarks_controller.md](./06_bookmarks_controller.md) | 장소 즐겨찾기, 코스 즐겨찾기 |
| InquiriesController | [07_inquiries_controller.md](./07_inquiries_controller.md) | 사용자 문의, 관리자 답변, 문의 상태 변경 |

## 공통 응답 래퍼

모든 정상 응답은 `success: true`와 `data`를 사용한다.

```json
{
  "success": true,
  "data": {}
}
```

모든 에러 응답은 `success: false`와 `error`를 사용한다.

`errData`라는 이름도 가능하지만, 일반적인 API 문서와 프론트 처리 관점에서는 `error`가 더 명확하다.

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "요청 값이 올바르지 않습니다.",
    "details": {}
  }
}
```

Controller는 성공 시 화면에서 사용할 실제 값을 `data` 안에 넣고, 실패 시에는 에러를 직접 만들기보다 전역 에러 미들웨어로 넘긴다.

## 공통 인증 방향

로그인이 필요한 API는 `Authorization: Bearer <token>`을 사용한다.

```text
authenticate middleware
→ JWT 검증
→ req.user = { idx, role }
→ controller 진입
```

현재 기준은 Stateless JWT이다.

- 서버 DB에 로그인 세션을 저장하지 않는다.
- 로그아웃은 클라이언트에서 JWT를 삭제한다.
- refresh token은 현재 범위에서 제외한다.

## 전화번호 인증 저장 방향

단기 프로젝트 기준으로 인증번호는 DB가 아니라 Node 메모리 `Map`에 저장하는 방향이 가장 단순하다.

다만 회원가입, 아이디 찾기, 비밀번호 재설정 인증이 서로 섞이면 안 되므로 `purpose` 값을 함께 저장한다.

```ts
type VerificationPurpose = "SIGNUP" | "FIND_ID" | "RESET_PASSWORD";

Map<verificationId, {
  purpose: VerificationPurpose;
  loginId?: string;
  phone: string;
  codeHash: string;
  expiresAt: Date;
  verified: boolean;
  verifiedUntil?: Date;
  attemptCount: number;
}>
```

관리 규칙:

- `verificationId`는 UUID 또는 충분히 긴 random string으로 만든다.
- 인증번호는 평문으로 저장하지 않고 hash로 저장한다.
- `purpose`가 다르면 같은 `verificationId`를 재사용하지 않는다.
- 회원가입 인증으로 검증된 `verificationId`를 비밀번호 재설정에 사용할 수 없게 한다.
- 만료된 인증은 요청 시 lazy cleanup하거나 주기적으로 정리한다.
- 인증번호 입력 실패 횟수 제한을 둔다.

## 아직 구현 전 확인할 점

- `running_sessions.status`, `running_sessions.distance`, `route_recommendations.name` 컬럼은 최신 서비스 흐름에 필요하지만 migration 반영 여부 확인이 필요하다.
- 코스 리뷰/별점은 최신 문서에서 언급되지만 현재 controller skeleton에는 아직 전용 controller가 없다.
- 관리자 전용 API를 사용자 API와 같은 controller에 둘지, `admin.*.controller.ts`로 분리할지 결정이 필요하다.
