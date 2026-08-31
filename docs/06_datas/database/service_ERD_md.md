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
- PK / FK / UNIQUE / 인덱스는 현재 ERD 정책을 기준으로 migration에서 생성한다.
- `jsonb` 컬럼은 아직 세부 인터페이스가 확정되지 않았거나 가변적인 설정/Feature 저장에 사용한다.
- 관리자 여부나 추천 경로 소유 관계처럼 DB 제약만으로 충분하지 않은 규칙은 서비스 로직에서 추가 검증한다.

---
## service.users - 사용자 기본 정보

- idx: 식별자
- login_id: 로그인 아이디
  - UNIQUE
  - NOT NULL
- password_hash: 해시된 비밀번호
  - NOT NULL
- nickname: 사용자 닉네임
  - NOT NULL
  - 중복 허용 여부는 추후 정책 확정
- total_exp: 총 경험치
  - 기본값 0
- role: enum[USER / ADMIN]
  - 기본값 USER
- phone: 사용자 전화번호
  - 전화번호 중복 허용 여부는 추후 정책 확정
- status: enum[ENABLED / SUSPENDED / WITHDRAWN]
  - ENABLED: 정상 사용 가능
  - SUSPENDED: 관리자에 의해 이용 정지된 상태
  - WITHDRAWN: 회원 탈퇴 상태
  - 기본값 ENABLED
- suspended_until: 이용 정지 종료 시각
  - timestamp
  - NULL이면 정지 종료 시각이 별도로 지정되지 않은 상태
- last_login_at: 마지막 로그인 시각
  - timestamp
  - 로그인 이력이 없으면 NULL
- created_at: 생성일자
- updated_at: 수정일자
- admin_memo: 해당 사용자에 대한 관리자 메모

---

## service.user_profiles - 사용자 프로필 및 러닝 설정 정보

- idx: 식별자
- users_idx: FK -> service.users.idx
  - 사용자별 하나의 프로필만 존재
  - UNIQUE
- weight: 사용자 몸무게 (kg)
- height: 사용자 키 (cm)
- running_settings: jsonb 타입 러닝 설정
  - 기본 목표 거리
  - 선호 경사도
  - 선호 시설
  - 야간 인프라 중요도 등 가변적인 사용자 러닝 설정 저장
- profile_image_url: 사용자 프로필 이미지 URL
  - 서버에서 기본 프로필 이미지 중 하나를 랜덤으로 부여

---

## service.running_goals - 사용자의 월간 / 주간 러닝 목표

- idx: 식별자
- users_idx: FK -> service.users.idx
- goal_type: enum[WEEKLY / MONTHLY]
- target_distance: 목표 거리 (m)
- status: enum[ACTIVE / SUCCESS / FAILED / STOPPED]
  - 기본값 ACTIVE
- start_date: 목표 시작일자
- end_date: 예정된 목표 종료일자
- finished_at: 실제 목표 종료 시각
  - 목표가 아직 종료되지 않았다면 NULL
- created_at: 생성일자

---

## service.point_bookmarks - 사용자 출발지 / 목적지 / 경유지 즐겨찾기

- idx: 식별자
- users_idx: FK -> service.users.idx
- name: 사용자가 저장한 지점 이름 
- point: 저장된 지점
  - PostGIS geometry(Point, 4326)

---

## service.route_requests - 사용자가 입력한 경로 추천 요청

- idx: 식별자
- users_idx: FK -> service.users.idx
- prompt: 사용자가 입력한 자연어 요청
  - 자연어 요청이 없는 경우 NULL 가능
- element_conditions: 알고리즘 입력 조건
  - jsonb
  - 경사도, 시설, 거리, 야간 인프라 등의 구조화된 조건 저장
  - 알고리즘 인터페이스 확정 후 일부 컬럼 분리 가능
- selected_recommendations_idx: 사용자가 최종 선택한 후보 경로
  - FK -> service.route_recommendations.idx
  - 후보를 선택하기 전에는 NULL
  - 해당 recommendation이 반드시 현재 route_request에서 생성된 후보인지 서비스 로직에서 검증
- created_at: 생성일자

---

## service.route_request_points - 사용자가 경로 요청 시 지정한 출발지 / 경유지 / 목적지

- idx: 식별자
- route_requests_idx: FK -> service.route_requests.idx
- sequence: 요청 지점 순서
  - 동일 route_request 안에서 중복 불가
- point_type: enum[START / WAYPOINT / END]
- point: 요청 지점
  - PostGIS geometry(Point, 4326)

---

## service.route_recommendations - 알고리즘이 생성한 후보 경로

- idx: 식별자
- route_requests_idx: FK -> service.route_requests.idx
- score: 알고리즘을 통해 계산된 후보 경로의 최종 점수
- feature_scores: jsonb 타입의 피처별 평가 점수
  - 예: 경사도 점수, 화장실 점수, 야간 인프라 점수
- feature_values: jsonb 타입의 피처별 실제 계산 값
  - 예: 화장실 개수, 편의점 개수, 야간 인프라 밀도
- total_distance: 후보 경로의 총 거리 (m)
- total_ascent: 후보 경로의 누적 상승 고도 (m)
- slope_std: 후보 경로 경사도의 표준편차
  - 경사도 단위는 알고리즘에서 사용하는 slope 단위와 동일하게 통일
  - 알고리즘 계산 대상이 고도 표준편차로 변경될 경우 elevation_std로 변경
- route: 후보 경로 전체 선형 공간 데이터
  - PostGIS geometry(LineString, 4326)
- created_at: 생성일자

---

## service.route_points - 후보 경로에 포함된 주요 지점

- idx: 식별자
- route_recommendations_idx: FK -> service.route_recommendations.idx
- sequence: 경로 내 주요 지점 순서
  - 동일 route_recommendation 안에서 중복 불가
- title: 지점 명칭
- point_type: enum[START / WAYPOINT / END]
- elevation: 해당 지점의 고도 (m)
- slope: 해당 지점의 경사도
  - 경사도 단위는 알고리즘에서 % 또는 degree 중 하나로 통일
- point: 지점 공간 데이터
  - PostGIS geometry(Point, 4326)

---

## service.route_bookmarks - 사용자가 즐겨찾기한 추천 코스

- idx: 즐겨찾기 식별자
- users_idx: FK -> service.users.idx
- route_recommendations_idx: FK -> service.route_recommendations.idx
- 동일 사용자가 동일 경로를 두 번 즐겨찾기할 수 없음
  - UNIQUE(users_idx, route_recommendations_idx)

---

## service.running_sessions - 한 번의 러닝 전체 기록

- idx: 식별자
- users_idx: FK -> service.users.idx
- route_recommendations_idx: FK -> service.route_recommendations.idx
  - 현재 정책에서는 추천 경로를 선택한 뒤 러닝한다고 가정
- started_at: 러닝 시작 시각
- finished_at: 러닝 종료 시각
  - 진행 중인 러닝이면 NULL
- average_pace: running_trackpoints를 기반으로 계산한 전체 평균 페이스
  - numeric으로 저장할 경우 초/km 등의 하나의 단위로 통일

---

## service.running_trackpoints - 러닝 중 주기적으로 수집한 GPS 위치 기록

- idx: 식별자
- running_sessions_idx: FK -> service.running_sessions.idx
- point: 기록된 GPS 위치
  - PostGIS geometry(Point, 4326)
- recorded_at: GPS 위치가 기록된 시각
- accuracy: 단말 위치 API가 제공하는 위치 정확도 추정값

---

## service.inquiries - 사용자 문의사항 및 관리자 답변

- idx: 식별자
- users_idx: FK -> service.users.idx
- title: 문의 제목
- content: 문의 내용
- status: enum[PENDING / IN_PROGRESS / ANSWERED]
  - PENDING: 아직 관리자가 처리하지 않은 상태
  - IN_PROGRESS: 관리자가 처리 중인 상태
  - ANSWERED: 답변이 완료된 상태
  - 기본값 PENDING
- answer: 관리자 답변
  - 답변 전에는 NULL
- answerer_idx: 답변한 관리자
  - FK -> service.users.idx
  - 답변 전에는 NULL
  - 해당 사용자의 role이 ADMIN인지 서비스 로직에서 검증
- memo: 문의에 대한 관리자 내부 메모
- created_at: 문의 생성 시각
- answered_at: 답변 완료 시각
  - 답변 전에는 NULL
