# RunStop DB Schema

- users: 사용자 기본 정보
  - idx: 식별자
  - nickname: 사용자에게 보여줄 이름 (Google에서 제공받은 이름 사용)
  - total_exp: 총 경험치 (기본값 0)
  - role: enum[USER / ADMIN] (기본값 USER)
  - created_at: 생성일자
  - updated_at: 수정일자

- user_auths: 사용자의 OAuth 인증 정보
  - idx: 식별자
  - user_idx: FK -> users.idx
  - provider: OAuth 제공자 (현재 GOOGLE만 사용)
  - provider_user_id: OAuth 제공자의 사용자 식별자 (Google의 sub)
  - created_at: 생성일자

- running_goal: 사용자의 월간 / 주간 러닝 목표
  - idx: 식별자
  - user_idx: FK -> users.idx
  - goal_type: enum[WEEKLY / MONTHLY]
  - target_distance: 목표 거리(m)
  - status: enum[ACTIVE / SUCCESS / FAILED / STOPPED] (기본값 ACTIVE)
  - start_date: 목표 시작일자
  - end_date: 예정된 목표 종료일자
  - finished_at: 실제 목표 종료 시각
  - created_at: 생성일자

- route_requests: 사용자가 입력한 경로 요청 정보
  - idx: 식별자
  - user_idx: FK -> users.idx
  - prompt: 사용자가 입력한 자연어 요청
  - element_conditions: 알고리즘 입력 조건 (JSON 또는 추후 컬럼 분리)
  - selected_recommendation_idx: 사용자가 선택한 후보 경로
    - FK -> route_recommendation.idx
    - 후보 선택 전에는 NULL
  - created_at: 생성일자

- route_recommendation: 알고리즘이 생성한 후보 경로
  - idx: 식별자
  - route_requests_idx: FK -> route_requests.idx
  - score: 알고리즘을 통해 계산된 후보 경로 점수
  - total_distance: 후보 경로의 총 거리
  - total_ascent: 후보 경로의 총 상승 고도
  - geometry: PostGIS LineString
    - 후보 경로 전체를 구성하는 선형 공간 데이터
  - created_at: 생성일자

- route_point: 후보 경로에 포함된 주요 지점
  - idx: 식별자
  - route_recommendation_idx: FK -> route_recommendation.idx
  - sequence: 경로 내 주요 지점 순서
  - title: 지점 명칭
  - point_type: enum[START / WAYPOINT / END]
  - elevation: 해당 지점의 고도
  - point: PostGIS Point
    - 위도 / 경도를 하나의 공간 데이터로 저장
    - geometry(Point, 4326)

- running_session: 한 번의 러닝 전체 기록
  - idx: 식별자
  - user_idx: FK -> users.idx
  - route_recommendation_idx: FK -> route_recommendation.idx
  - started_at: 러닝 시작 시간
  - finished_at: 러닝 종료 시간
  - average_pace: running_trackpoint를 기반으로 계산한 전체 평균 페이스

- running_trackpoint: 러닝 중 주기적으로 수집한 GPS 위치 기록
  - idx: 식별자
  - running_session_idx: FK -> running_session.idx
  - latitude: 위도
  - longitude: 경도
  - recorded_at: GPS 위치가 기록된 시각
  - accuracy: 단말 위치 API가 제공하는 위치 정확도 추정값