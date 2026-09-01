# [랭체인 중간프로젝트] 서버 API 후보 리뷰하기
> API 상태가 어떤지, 이것이 어떤 흐름으로 돌아가는지를 명확하게 추적하기 위해 한번 머리에 API 동작 방식을 넣을 생각입니다.

## 0. 기본 바탕
> 전역적인 적용 사항에 대해서 설명합니다.
### 계층
우선 기본적으로 저희 서버에는 다음과 같은 계층이 존재합니다.

0. 어플리케이션 및 미들웨어 계층
1. 라우터 계층
2. 서비스 계층
3. 외부 연결용 계층 (`repositories`, `adapters`)
4. 외부 인프라 드라이버 (`database`, `api`, `fastapi` 등)

### 도메인 
또한 도메인의 경우에는 다음과 같이 분리되어있습니다.
```md
- `auth`: 인증인가 관련
- `users`: 사용자 관련 (닉네임, 마이페이지, 프로필 수정, 회원 탈퇴 등)
- `routes`: 코스 추천 요청, 코스 저장 등
- `running`: 사용자의 실시간 러닝 및 기록 관련
- `goals`: 사용자의 목표(주간/월간) 추적
- `bookmarks`: 즐겨찾기 코스 및 경유지 북마크 관련
- `inquiries`: 사용자 문의 및 관리자 답변, 문의 상태
```

### **전체 응답 구조**
```json
{
  "success": "boolean",
  "data": {}, // 정상 응답의 경우에 해당 object에 데이터가 넣어집니다.
  "error": { // 에러가 날 시에 해당 object에 데이터가 들어갑니다.
    "code": "ERROR_CODE",
    "message": "error message",
    "details": {} // 추가적인 데이터는 선택적으로 해당 object에 들어가게 됩니다.
  } 
}
```

에러는 최대한 바깥쪽 에러 미들웨어에서 처리 가능한 형태로 결정했습니다. 순서는
1. 미들웨어 및 컨트롤러 하위 계층에서 ApiError을 낸다면 마지막에 존재하는 `errorHandler`가 잡아줍니다.
2. `404`의 경우에는 그보다 한단계 앞에있는 일단 `notFoundHandler`가 해당 오류를 잡아주게 됩니다.
3. 정말 정의되지 않은 오류가 발생할 경우 최종적으로 `errorHandler`의 기본 고정 에러 응답으로 반환되게 됩니다.


### **인증인가**
인증인가 시에는 24시간짜리 JWT 토큰을 사용하며 서버에서 해당 JWT 상태를 저장하지 않습니다.

또한 필요한 인증 인가의 경우에는 `/middleware/auth.ts`의 `authenticate`, `requireAdmin`, `requireGuest` 를 이용하여 올바른 권한 구조를 잡아줍니다.

주요 로그인 상태 핸들러는 `authenticate` 미들웨어로 `Bearer <token>` 형태를 받으며 `payload`에는 기본 `jwt` 요소들과 `idx`, `role`가 들어간 일반 객체를 기대합니다.

또한 꺼낸 `idx` 정보를 이용하여 DB 조회를 한 뒤, `idx`, `role`, `status`, `suspend_until` 값을 이용하여 사용자가 여전히 접근 가능한 상태인지 확인하게 됩니다.

### **비동기**
모든 응답의 경우에는 `asyncHandler`을 이용하여 비동기 처리가 가능하게 설계되었습니다.

```ts
/**
 * 비동기 컨트롤러에서 발생한 에러를 Express next로 전달합니다.
 */
export function asyncHandler(
  // 실제로 돌아가야하는 async 함수를 인자로 받습니다.
  handler: (req: Request, res: Response, next: NextFunction) => void | Promise<void>,
): RequestHandler {
  // 특별한 작업을 하지 않고 Promise.resolve를 이용하여 응답하며 에러 등의 처리는 next 객체를 이용하여 처리할 수 있게 합니다.
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
```

> `Express 5`에서는 Promise의 reject를 자동으로 catch 해주기 때문에 괜찮지만 큰 문제 없는 함수이기 때문에 사용하였습니다.

## 1. AuthController
기본적으로 인증인가 구조는 미들웨어를 제외하면 서버 기준 크게 4가지 사용이 존재합니다.
- 회원가입
- 비밀번호 찾기
- 아이디 찾기
- 회원 탈퇴

### 1. 로그인
로그인은 다음과 같은 API 형식을 가집니다.

**`POST /api/auth/login`**
```json
Request:

{
  "loginId": "hurwan0629",
  "password": "password"
}

Response:

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

작업 순서는 
1. 아이디를 통해 회원 정보 (`idx`, `login_id`, `password_hash`, `nickname`, `role`, `status`, `suspended_until`) 추출
2. 비밀번호 비교
3. `status`와 `suspended_until`을 이용해서 정지 상태 또는 탈퇴 확인 후 정지 기간이 만료되었으면 모두 정상 회원 상태로 돌려주기
4. 마지막 로그인 시간 업데이트해주기
5. `{ idx, role }` 값이 들어간 `jwt`를 `accessToken`으로 발급해주기

### 2. 회원가입
회원가입은 크게 4단계로 이루어져있습니다.
1. 아이디 중복검사 (특별히 연계되는 기능 없음)
2. 전화번호 인증코드 발송 (3분 만료)
3. 전화번호 인증코드 인증 (성공 시 10분으로 증가)
4. 회원가입 (기타 요소들 모두 검사)