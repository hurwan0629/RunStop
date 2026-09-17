# GoalsController 구현 방향

## 담당 범위

사용자의 주간/월간 러닝 목표를 관리한다.

- 현재 목표 조회
- 목표 생성
- 목표 중지
- 만료된 목표 상태 갱신

## 관련 파일

```text
backend/src/routes/goals.routes.ts
backend/src/controllers/goals.controller.ts
backend/src/services/goals.service.ts
backend/src/repositories/running-goals.repository.ts
backend/src/repositories/running-sessions.repository.ts
```

## API 명세

### 현재 목표 조회

`GET /api/goals/current`

Response:

```json
{
  "success": true,
  "data": {
    "goal": {
      "idx": 44,
      "type": "WEEKLY",
      "targetDistance": 30000,
      "runningDistance": 17400,
      "status": "ACTIVE",
      "startDate": "2026-09-01",
      "endDate": "2026-09-07"
    }
  }
}
```

흐름:

```text
authenticate
→ goalsService.refreshExpiredGoals
→ goalsService.getCurrentRunningGoal
→ runningGoalsRepository.findActiveGoalByUserIdx
→ 목표 기간 내 running_sessions 거리 합산
→ 응답 반환
```

목표가 없을 때:

```json
{
  "success": true,
  "data": {
    "goal": null
  }
}
```

### 목표 생성

`POST /api/goals`

Request:

```json
{
  "goalType": "WEEKLY",
  "targetDistanceM": 30000
}
```

Response:

```json
{
  "success": true,
  "data": {
    "idx": 44,
    "goalType": "WEEKLY",
    "targetDistanceM": 30000,
    "status": "ACTIVE",
    "startDate": "2026-09-01",
    "endDate": "2026-09-07"
  }
}
```

흐름:

```text
authenticate
→ 목표 DTO 검증
→ 같은 사용자에게 ACTIVE 목표가 있는지 확인
→ start_date / end_date 계산
→ running_goals INSERT
→ 응답 반환
```

기간 계산 방향:

- `WEEKLY`: 시작일은 오늘, 종료일은 7일 뒤 또는 해당 주의 끝
- `MONTHLY`: 시작일은 오늘, 종료일은 한 달 뒤 또는 해당 월의 끝

팀 프로젝트에서는 “아무 때나 시작 가능”이라는 문서 내용에 맞춰 `오늘 ~ N일 뒤` 방식이 더 단순하다.

### 목표 중지

`POST /api/goals/:goalIdx/stop`

Response:

```json
{
  "success": true,
  "data": {
    "idx": 44,
    "status": "STOPPED",
    "finishedAt": "2026-09-01T15:30:00+09:00"
  }
}
```

흐름:

```text
authenticate
→ goalIdx params 검증
→ goal 소유권 확인
→ status = ACTIVE 확인
→ status = STOPPED
→ finished_at = now()
```

### 만료 처리

명시 API로 만들기보다 목표 조회나 홈/마이페이지 조회 전에 service 내부에서 호출하는 방식이 적절하다.

```text
refreshExpiredGoals(userIdx)
→ ACTIVE 목표 중 end_date < today 조회
→ 목표 기간의 러닝 거리 합계 계산
→ target_distance 이상이면 SUCCESS
→ 아니면 FAILED
→ finished_at 갱신
```

## DB 정책

현재 문서 흐름상 한 사용자가 동시에 여러 ACTIVE 목표를 가지면 화면이 복잡해진다.

초기 구현에서는 service에서 다음 규칙을 둔다.

- 같은 사용자는 ACTIVE 목표를 1개만 가진다.
- 이미 ACTIVE 목표가 있으면 새 목표 생성은 `409`로 막는다.

나중에 DB 레벨로 강화하려면 partial unique index를 고려한다.

## 에러 방향

| 상황 | 권장 코드 |
|---|---|
| 목표 없음 | `RUNNING_GOAL_NOT_FOUND` |
| 이미 활성 목표 있음 | `ACTIVE_GOAL_ALREADY_EXISTS` |
| 거리 범위 오류 | `INVALID_TARGET_DISTANCE` |
| 소유자 불일치 | `FORBIDDEN` |
| 이미 종료된 목표 | `RUNNING_GOAL_ALREADY_FINISHED` |

## 구현 시 우선순위

1. 현재 목표 조회
2. 목표 생성
3. 목표 중지
4. 만료 목표 자동 갱신
5. 마이페이지/홈 집계와 연결
