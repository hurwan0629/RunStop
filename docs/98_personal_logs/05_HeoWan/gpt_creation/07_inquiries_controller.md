# InquiriesController 구현 방향

## 담당 범위

사용자 문의와 관리자 답변 흐름을 담당한다.

- 사용자 문의 생성
- 문의 목록 조회
- 문의 상세 조회
- 문의 상태 변경
- 관리자 답변 등록

현재 controller skeleton은 사용자/관리자 기능을 한 파일에 같이 둘 수 있는 형태다. 관리자 기능이 커지면 `admin-inquiries.controller.ts`로 분리하는 편이 좋다.

## 관련 파일

```text
backend/src/routes/inquiries.routes.ts
backend/src/controllers/inquiries.controller.ts
backend/src/services/inquiries.service.ts
backend/src/repositories/inquiries.repository.ts
backend/src/repositories/users.repository.ts
backend/src/middleware/auth.ts
```

## API 명세

### 문의 목록 조회

`GET /api/inquiries`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "idx": 38,
        "title": "원하는 거리의 코스가 나오지 않아요",
        "status": "PENDING",
        "createdAt": "2026-09-01T15:30:00+09:00"
      }
    ]
  }
}
```

흐름:

```text
authenticate
→ inquiriesService.listInquiries
→ USER이면 본인 문의만 조회
→ ADMIN이면 전체 문의 조회 가능
→ pagination 적용
```

초기 구현에서는 관리자 화면이 아직 명확하지 않으므로 사용자 본인 문의 목록부터 구현한다.

### 문의 생성

`POST /api/inquiries`

Request:

```json
{
  "title": "원하는 거리의 코스가 나오지 않아요",
  "content": "7km를 입력했는데 3km 코스만 나옵니다."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "idx": 38,
    "status": "PENDING"
  }
}
```

흐름:

```text
authenticate
→ inquiryCreateSchema 검증
→ inquiriesService.createInquiry
→ inquiriesRepository.createInquiry
→ status = PENDING
```

### 문의 상세 조회

`GET /api/inquiries/:inquiryIdx`

Response:

```json
{
  "success": true,
  "data": {
    "idx": 38,
    "title": "원하는 거리의 코스가 나오지 않아요",
    "content": "7km를 입력했는데 3km 코스만 나옵니다.",
    "status": "ANSWERED",
    "answer": "조건을 완화해서 다시 시도해 주세요.",
    "createdAt": "2026-09-01T15:30:00+09:00",
    "answeredAt": "2026-09-01T18:20:00+09:00"
  }
}
```

흐름:

```text
authenticate
→ inquiryIdx params 검증
→ inquiry 조회
→ USER이면 users_idx 소유권 확인
→ ADMIN이면 접근 허용
→ 상세 DTO 반환
```

### 문의 상태 변경

`PATCH /api/inquiries/:inquiryIdx/status`

Request:

```json
{
  "status": "IN_PROGRESS"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "idx": 38,
    "status": "IN_PROGRESS"
  }
}
```

흐름:

```text
authenticate
→ requireAdmin
→ inquiryStatusUpdateSchema 검증
→ inquiry 조회
→ inquiriesRepository.updateInquiryStatus
```

관리자 권한이 필요한 API다. 라우터에서 `authenticate`, `requireAdmin`, `asyncHandler` 순서로 연결하는 방향이 좋다.

### 문의 답변 등록

`POST /api/inquiries/:inquiryIdx/answer`

Request:

```json
{
  "answer": "확인 후 안내드립니다.",
  "memo": "경로 생성 로그 확인 필요"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "idx": 38,
    "status": "ANSWERED",
    "answeredAt": "2026-09-01T18:20:00+09:00"
  }
}
```

흐름:

```text
authenticate
→ requireAdmin
→ inquiryAnswerSchema 검증
→ inquiry 조회
→ answer 저장
→ memo 저장
→ answerer_idx = req.user.idx
→ status = ANSWERED
→ answered_at = now()
```

## DB 정책

`inquiries`는 다음 필드를 중심으로 사용한다.

- `users_idx`: 문의 작성자
- `title`
- `content`
- `status`: `PENDING`, `IN_PROGRESS`, `ANSWERED`
- `answer`
- `answerer_idx`
- `memo`
- `created_at`
- `answered_at`

문의 유형 컬럼은 현재 DB에 없다. 관리자 UI에서 유형 필터가 필요하면 migration으로 컬럼을 추가해야 한다.

## 에러 방향

| 상황 | 권장 코드 |
|---|---|
| 문의 없음 | `INQUIRY_NOT_FOUND` |
| 소유자 불일치 | `FORBIDDEN` |
| 관리자 권한 없음 | `ADMIN_REQUIRED` |
| 제목/내용 오류 | `INVALID_INQUIRY` |
| 이미 답변된 문의 재답변 정책 충돌 | `INQUIRY_ALREADY_ANSWERED` |

## 구현 시 우선순위

1. 사용자 문의 생성
2. 사용자 본인 문의 목록/상세 조회
3. 관리자 상태 변경
4. 관리자 답변 등록
5. 관리자 목록 필터와 페이지네이션
