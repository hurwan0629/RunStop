# [데이터베이스 ERD] service 스키마

> 현재 RunStop 서비스 ERD 및 migration 설계 기준으로 작성한 `service` 스키마 설명입니다.
>
> `service` 스키마는 사용자, 러닝 목표, 경로 추천 요청/결과, GPS 기록, 문의 등
> **서비스 실행 중 생성되거나 지속적으로 변경되는 데이터**를 저장합니다.

---

## 공통 기준

- 서비스 테이블은 모두 `service` 스키마에 생성한다.
- 공간 좌표계는 기본적으로 `EPSG:4326`을 사용한다.
- 지점 데이터는 `geometry(Point, 4326)`, 경로 데이터는 `geometry(LineString, 4326)`을 사용한다.
- PostGIS 내부 좌표 순서는 `longitude, latitude`를 사용한다.
- 실제 시각을 나타내는 값은 기본적으로 `timestamptz`를 사용한다.
- 기간의 날짜 자체가 의미를 가지는 `start_date`, `end_date`는 `date`를 사용한다.
- 생성 시각은 가능한 경우 `DEFAULT now()`를 사용한다.
- PK / FK / UNIQUE / 인덱스는 현재 ERD 정책을 기준으로 migration에서 생성한다.
- `jsonb` 컬럼은 아직 세부 인터페이스가 확정되지 않았거나 가변적인 설정 / Feature 저장에 사용한다.
- 관리자 여부나 추천 경로 소유 관계처럼 DB 제약만으로 충분하지 않은 규칙은 서비스 로직에서 추가 검증한다.
- `route_requests`를 비롯한 경로 추천 이력은 현재 정책상 삭제하지 않고 보존한다.
- 문자열과 `numeric` 타입은 migration에서 명시적인 최대 길이 / 정밀도를 지정한다.

### 문자열 길이 기준

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `users.login_id` | `varchar(50)` | 로그인 아이디 |
| `users.password_hash` | `varchar(255)` | bcrypt 및 향후 해시 포맷 확장 고려 |
| `users.nickname` | `varchar(30)` | 사용자 닉네임 |
| `users.phone` | `varchar(20)` | 정규화된 전화번호 저장 |
| `point_bookmarks.name` | `varchar(100)` | 저장 지점 이름 |
| `route_recommendations.name` | `varchar(100)` | 추천 코스 표시 이름 |
| `route_points.title` | `varchar(100)` | 주요 지점 표시 이름 |
| `inquiries.title` | `varchar(200)` | 문의 제목 |

### 숫자 단위 / 저장 규칙

| 컬럼 / 값 | 저장 단위 | 타입 | 비고 |
|---|---|---|---|
| `user_profiles.weight` | kg | `numeric(5,2)` | 예: `72.50` |
| `user_profiles.height` | cm | `numeric(5,2)` | 예: `175.30` |
| `running_goals.target_distance` | m | `integer` | 프론트에서 km로 변환 |
| `route_recommendations.score` | 0~100 점수 | `numeric(6,3)` | 단위 없는 평가 점수 |
| `route_recommendations.total_distance` | m | `integer` | 추천 경로 총 거리 |
| `route_recommendations.total_ascent` | m | `numeric(8,2)` | 누적 상승 고도 |
| `route_recommendations.slope_std` | % 기준 경사값의 표준편차 | `numeric(7,3)` | slope와 같은 스케일 |
| `route_points.elevation` | m | `numeric(8,2)` | 지점 고도 |
| `route_points.slope` | % | `numeric(7,3)` | degree 대신 %로 통일 |
| `running_sessions.distance` | m | `integer` | 실제 GPS trackpoint 집계 거리 |
| `running_sessions.average_pace` | sec/km | `integer` | `323` = 5분 23초/km |
| `running_trackpoints.accuracy` | m | `numeric(8,2)` | GPS 정확도 |

JSON 내부는 다음 기준으로 통일한다.

- `feature_scores`: 각 Feature 평가 점수는 `0~100` 스케일 권장
- `feature_values`: 실제 계산 단위 유지
  - 거리: `m`
  - 고도 / 누적 상승 고도: `m`
  - 경사: `%`
  - 시설 수: `count`
  - 시설 밀도: `count/km`
  - 비율: `%`
- `element_conditions`, `running_settings`에서도 같은 값은 같은 단위를 사용한다.

거리와 시간은 DB에서 `m`, `sec` 기반으로 저장하고 프론트에서 `km`, `분:초/km`로 표시한다.

---

## service.users - 사용자 기본 정보

- idx: 식별자
- login_id: 로그인 아이디 (`varchar(50)`)
  - UNIQUE / NOT NULL
  - 회원 탈퇴 시 `withdraw_[idx]_<random>` 형태로 변경하여 기존 아이디를 재사용할 수 있도록 한다.
- password_hash: 해시된 비밀번호 (`varchar(255)`)
  - NOT NULL
  - 회원 탈퇴 시 랜덤 문자열의 bcrypt hash 등 기존 비밀번호로 인증할 수 없는 값으로 무효화한다.
- nickname: 사용자 닉네임 (`varchar(30)`)
  - NOT NULL
  - 일반 프로필 수정에서는 nickname만 변경한다.
- total_exp: 총 경험치
  - 기본값 0
- role: enum[USER / ADMIN]
  - 기본값 USER
- phone: 사용자 전화번호 (`varchar(20)`)
  - NULLABLE / UNIQUE
  - 일반 프로필 수정에서는 변경하지 않는다.
  - 회원 탈퇴 시 NULL로 변경
- status: enum[ENABLED / SUSPENDED / WITHDRAWN]
  - ENABLED: 정상 사용 가능
  - SUSPENDED: 관리자에 의해 이용 정지된 상태
  - WITHDRAWN: 회원 탈퇴 상태
  - 기본값 ENABLED
- suspended_until: 이용 정지 종료 시각 (`timestamptz`)
  - NULL이면 영구 정지 또는 별도의 종료 시각이 없는 상태
- last_login_at: 마지막 로그인 시각 (`timestamptz`)
- created_at: 생성 시각 (`timestamptz`, DEFAULT now())
- updated_at: 수정 시각 (`timestamptz`)
- withdrawn_at: 실제 회원 탈퇴 시각 (`timestamptz`)
- admin_memo: 관리자 메모

---

## service.user_profiles - 사용자 프로필 및 러닝 설정 정보

- idx: 식별자
- users_idx: FK -> service.users.idx / UNIQUE
- weight: 사용자 몸무게 (`numeric(5,2)`, kg)
- height: 사용자 키 (`numeric(5,2)`, cm)
- running_settings: jsonb 타입 러닝 설정
  - 거리 값은 m, 경사 값은 %를 기본 단위로 사용

현재 프로필 이미지는 DB에 저장하지 않고 프론트에서 할당하는 방식으로 처리한다.

---

## service.running_goals - 사용자의 월간 / 주간 러닝 목표

- idx: 식별자
- users_idx: FK -> service.users.idx
- goal_type: enum[WEEKLY / MONTHLY]
- target_distance: 목표 거리 (`integer`, m)
- status: enum[ACTIVE / SUCCESS / FAILED / STOPPED], 기본값 ACTIVE
- start_date: 목표 시작일 (`date`)
- end_date: 예정 종료일 (`date`)
- finished_at: 실제 종료 시각 (`timestamptz`)
- created_at: 생성 시각 (`timestamptz`, DEFAULT now())

목표 달성 화면에서 사용하는 실제 달린 거리는 별도 컬럼으로 중복 저장하지 않고 목표 기간의 `running_sessions.distance`를 집계하여 계산한다.

---

## service.point_bookmarks - 사용자 출발지 / 목적지 / 경유지 즐겨찾기

- idx: 식별자
- users_idx: FK -> service.users.idx
- name: 저장 지점 이름 (`varchar(100)`)
- point: PostGIS `geometry(Point, 4326)`

---

## service.route_requests - 사용자가 입력한 경로 추천 요청

- idx: 식별자
- users_idx: FK -> service.users.idx
- prompt: 자연어 요청, NULL 가능
- element_conditions: jsonb
  - 거리=m, 경사=%, 시설 개수=count 등의 공통 단위 사용
- selected_recommendations_idx: FK -> service.route_recommendations.idx, NULL 가능
  - 해당 recommendation이 현재 request의 후보인지 서비스 로직에서 검증
- created_at: `timestamptz`, DEFAULT now()

현재 정책에서는 `route_requests` 및 관련 추천 이력을 삭제하지 않고 보존한다.

---

## service.route_request_points - 요청 출발지 / 경유지 / 목적지

- idx: 식별자
- route_requests_idx: FK -> service.route_requests.idx
- sequence: 요청 지점 순서, 동일 request 내 UNIQUE
- point_type: enum[START / WAYPOINT / END]
- point: PostGIS `geometry(Point, 4326)`

---

## service.route_recommendations - 알고리즘이 생성한 후보 경로

- idx: 식별자
- route_requests_idx: FK -> service.route_requests.idx
- name: 후보 경로 이름 (`varchar(100)`)
  - 러닝 기록 및 즐겨찾기 화면에서 표시 이름으로 사용
- score: 최종 점수 (`numeric(6,3)`, 0~100 권장)
- feature_scores: jsonb, 피처별 점수 0~100 권장
- feature_values: jsonb, 실제 단위 유지
- total_distance: 총 거리 (`integer`, m)
- total_ascent: 누적 상승 고도 (`numeric(8,2)`, m)
- slope_std: 경사도 표준편차 (`numeric(7,3)`, % 기준 경사값)
- route: PostGIS `geometry(LineString, 4326)`
- created_at: `timestamptz`, DEFAULT now()

---

## service.route_points - 후보 경로 주요 지점

- idx: 식별자
- route_recommendations_idx: FK -> service.route_recommendations.idx
- sequence: 경로 내 주요 지점 순서, 동일 recommendation 내 UNIQUE
- title: 지점 명칭 (`varchar(100)`)
- point_type: enum[START / WAYPOINT / END]
- elevation: 고도 (`numeric(8,2)`, m)
- slope: 경사도 (`numeric(7,3)`, %)
- point: PostGIS `geometry(Point, 4326)`

`route_points`는 전체 경로 좌표가 아니라 의미 있는 주요 지점을 저장한다. 실제 전체 경로는 `route_recommendations.route` LineString을 기준으로 한다.

---

## service.route_bookmarks - 사용자가 즐겨찾기한 추천 코스

- idx: 식별자
- users_idx: FK -> service.users.idx
- route_recommendations_idx: FK -> service.route_recommendations.idx
- UNIQUE(users_idx, route_recommendations_idx)

---

## service.running_sessions - 한 번의 러닝 전체 기록

- idx: 식별자
- users_idx: FK -> service.users.idx
- route_recommendations_idx: FK -> service.route_recommendations.idx
- status: enum[IN_PROGRESS / COMPLETED / STOPPED / FAILED]
  - IN_PROGRESS: 현재 러닝 진행 중
  - COMPLETED: 정상 종료
  - STOPPED: 사용자가 중간 종료
  - FAILED: 앱 / GPS 오류 등 비정상 종료
  - 기본값 IN_PROGRESS
- started_at: `timestamptz`
- finished_at: `timestamptz`, 진행 중이면 NULL
- distance: 실제 러닝 총 거리 (`integer`, m)
  - 러닝 종료 시 `running_trackpoints`를 기반으로 계산하여 저장
  - `route_recommendations.total_distance`와는 별개의 실제 이동 거리
- average_pace: 전체 평균 페이스 (`integer`, sec/km)
  - 예: `323` = 5분 23초/km

`running_sessions`는 성공한 러닝만 저장하는 테이블이 아니라 사용자가 러닝을 시작한 한 번의 세션 자체를 기록한다.

---

## service.running_trackpoints - 러닝 중 GPS 위치 기록

- idx: 식별자
- client_trackpoint_id: 클라이언트 생성 UUID, NOT NULL / UNIQUE
- running_sessions_idx: FK -> service.running_sessions.idx
- point: PostGIS `geometry(Point, 4326)`
- recorded_at: 실제 기록 시각 (`timestamptz`)
- accuracy: 위치 정확도 추정값 (`numeric(8,2)`, m)

`client_trackpoint_id`는 네트워크 단절 후 재전송 시 동일 GPS 데이터가 중복 삽입되지 않도록 사용한다.

실제 러닝 거리는 `point`를 시간순으로 연결하여 계산하고, 계산이 끝난 최종 총 거리는 `running_sessions.distance`에 저장한다.

구간별 평균 페이스는 현재 별도 테이블을 추가하지 않고 `point`와 `recorded_at`을 이용해 계산한다.

---

## service.inquiries - 사용자 문의사항 및 관리자 답변

- idx: 식별자
- users_idx: FK -> service.users.idx
- title: 문의 제목 (`varchar(200)`)
- content: 문의 내용
- status: enum[PENDING / IN_PROGRESS / ANSWERED], 기본값 PENDING
- answer: 관리자 답변, 답변 전 NULL
- answerer_idx: FK -> service.users.idx, 답변 전 NULL
  - ADMIN 여부는 서비스 로직에서 검증
- memo: 관리자 내부 메모
- created_at: `timestamptz`, DEFAULT now()
- answered_at: `timestamptz`, 답변 전 NULL
