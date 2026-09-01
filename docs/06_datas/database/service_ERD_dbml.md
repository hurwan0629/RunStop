Enum service.user_role {
  USER
  ADMIN
}

Enum service.user_status {
  ENABLED
  SUSPENDED
  WITHDRAWN
}

Enum service.goal_type {
  WEEKLY
  MONTHLY
}

Enum service.goal_status {
  ACTIVE
  SUCCESS
  FAILED
  STOPPED
}

Enum service.route_point_type {
  START
  WAYPOINT
  END
}

Enum service.running_session_status {
  IN_PROGRESS
  COMPLETED
  STOPPED
  FAILED
}

Enum service.inquiry_status {
  PENDING
  IN_PROGRESS
  ANSWERED
}

Table service.users {
  idx integer [pk, increment]

  login_id varchar(50) [not null, unique]
  password_hash varchar(255) [not null]
  nickname varchar(30) [not null]

  total_exp integer [not null, default: 0]
  role service.user_role [not null, default: 'USER']

  phone varchar(20) [unique]
  status service.user_status [not null, default: 'ENABLED']

  suspended_until timestamptz
  last_login_at timestamptz
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz
  withdrawn_at timestamptz
  admin_memo text

  indexes {
    nickname
    phone
    status
  }

  Note: '''
  회원 탈퇴 시 users 행 자체는 삭제하지 않는다.

  login_id는 withdraw_[idx]_<random> 형태 등으로 익명화하여
  기존 로그인 아이디를 다시 사용할 수 있도록 한다.

  phone은 NULL로 변경하며 password_hash는
  랜덤 문자열의 bcrypt hash 등 기존 비밀번호로 인증할 수 없는 값으로 무효화한다.

  status=SUSPENDED이고 suspended_until=NULL인 경우
  영구 정지 상태로 처리할 수 있다.

  일반 프로필 수정에서는 nickname만 변경하며
  phone은 프로필 수정 대상에 포함하지 않는다.
  '''
}

Table service.user_profiles {
  idx integer [pk, increment]
  users_idx integer [not null, unique]

  weight numeric(5,2) [note: '사용자 몸무게. 단위 kg']
  height numeric(5,2) [note: '사용자 키. 단위 cm']
  running_settings jsonb [note: '거리 값은 m, 경사 값은 %를 기본 단위로 사용']

  Note: '''
  프로필 이미지는 현재 DB에 저장하지 않고
  프론트에서 할당하는 방식으로 처리한다.
  '''
}

Table service.running_goals {
  idx integer [pk, increment]
  users_idx integer [not null]
  goal_type service.goal_type [not null]
  target_distance integer [not null, note: '목표 거리. 단위 m']
  status service.goal_status [not null, default: 'ACTIVE']
  start_date date [not null]
  end_date date [not null]
  finished_at timestamptz
  created_at timestamptz [not null, default: `now()`]

  indexes {
    users_idx
    (users_idx, status)
  }
}

Table service.point_bookmarks {
  idx integer [pk, increment]
  users_idx integer [not null]
  name varchar(100) [not null]
  point geometry [not null, note: 'PostGIS geometry(Point, 4326)']

  indexes {
    users_idx
  }
}

Table service.route_requests {
  idx integer [pk, increment]
  users_idx integer [not null]
  prompt text
  element_conditions jsonb [note: '알고리즘 입력 조건. 거리=m, 경사=%, 시설 개수=count 등의 공통 단위를 사용']
  selected_recommendations_idx integer
  created_at timestamptz [not null, default: `now()`]

  indexes {
    users_idx
    selected_recommendations_idx
    created_at
  }

  Note: '''
  selected_recommendations_idx가 설정되는 경우
  해당 route_recommendation이 반드시 현재 route_request에서
  생성된 후보인지 서비스 로직에서 추가 검증한다.

  사용자가 후보를 선택하지 않으면
  selected_recommendations_idx는 계속 NULL일 수 있다.

  현재 정책에서는 route_requests 및 관련 추천 이력을
  삭제하지 않고 보존한다.
  '''
}

Table service.route_request_points {
  idx integer [pk, increment]
  route_requests_idx integer [not null]
  sequence integer [not null]
  point_type service.route_point_type [not null]
  point geometry [not null, note: 'PostGIS geometry(Point, 4326)']

  indexes {
    route_requests_idx
    (route_requests_idx, sequence) [unique]
  }
}

Table service.route_recommendations {
  idx integer [pk, increment]
  route_requests_idx integer [not null]

  name varchar(100) [not null, note: '후보 경로 이름. 러닝 기록 등에서 표시 이름으로 사용']
  score numeric(6,3) [note: '후보 경로 최종 점수. 서비스 기준 0~100 스케일 권장']
  feature_scores jsonb [note: '피처별 평가 점수. 각 점수는 0~100 스케일 권장']
  feature_values jsonb [note: '실제값. 거리=m, 고도/상승고도=m, 경사=%, 시설=count, 밀도=count/km 등 실제 단위를 유지']
  total_distance integer [note: '후보 경로 총 거리. 단위 m']
  total_ascent numeric(8,2) [note: '후보 경로 누적 상승 고도. 단위 m']
  slope_std numeric(7,3) [note: '경사도 표준편차. slope와 동일하게 % 기준 경사값을 사용. 알고리즘 정책 변경 시 elevation_std로 변경 가능']

  route geometry [not null, note: 'PostGIS geometry(LineString, 4326). 실제 전체 경로 좌표 저장']
  created_at timestamptz [not null, default: `now()`]

  indexes {
    route_requests_idx
    (route_requests_idx, score)
  }
}

Table service.route_points {
  idx integer [pk, increment]
  route_recommendations_idx integer [not null]
  sequence integer [not null]
  title varchar(100)
  point_type service.route_point_type [not null]
  elevation numeric(8,2) [note: '해당 지점의 고도. 단위 m']
  slope numeric(7,3) [note: '해당 지점의 경사도. 단위 %']
  point geometry [not null, note: 'PostGIS geometry(Point, 4326)']

  indexes {
    route_recommendations_idx
    (route_recommendations_idx, sequence) [unique]
  }

  Note: '''
  전체 경로의 모든 좌표를 저장하는 테이블이 아니다.

  START / WAYPOINT / END 등
  후보 경로에서 의미 있는 주요 지점을 저장한다.

  실제 전체 경로 좌표는 route_recommendations.route
  LineString을 기준으로 한다.
  '''
}

Table service.route_bookmarks {
  idx integer [pk, increment]
  users_idx integer [not null]
  route_recommendations_idx integer [not null]

  indexes {
    users_idx
    route_recommendations_idx
    (users_idx, route_recommendations_idx) [unique]
  }
}

Table service.running_sessions {
  idx integer [pk, increment]
  users_idx integer [not null]
  route_recommendations_idx integer [not null]
  status service.running_session_status [not null, default: 'IN_PROGRESS']
  started_at timestamptz [not null]
  finished_at timestamptz
  distance integer [note: '실제 러닝 총 거리. running_trackpoints를 집계하여 저장. 단위 m']
  average_pace integer [note: '전체 평균 페이스. 단위 sec/km. 예: 5분 23초/km = 323']

  indexes {
    users_idx
    route_recommendations_idx
    started_at
  }

  Note: '''
  러닝을 시작하면 IN_PROGRESS 상태로 생성한다.

  정상 종료는 COMPLETED, 사용자가 중간 종료한 경우 STOPPED,
  앱/GPS 오류 등 비정상 종료는 FAILED로 기록한다.

  distance는 추천 경로의 total_distance가 아니라
  실제 running_trackpoints를 기반으로 계산한 러닝 거리이다.
  '''
}

Table service.running_trackpoints {
  idx integer [pk, increment]
  client_trackpoint_id uuid [not null, unique]
  running_sessions_idx integer [not null]
  point geometry [not null, note: 'PostGIS geometry(Point, 4326)']
  recorded_at timestamptz [not null]
  accuracy numeric(8,2) [note: '단말 위치 API가 제공하는 위치 정확도 추정값. 단위 m']

  indexes {
    running_sessions_idx
    client_trackpoint_id
    (running_sessions_idx, recorded_at)
  }

  Note: '''
  client_trackpoint_id는 클라이언트에서 생성한다.

  GPS 데이터를 로컬에 캐싱한 뒤 재전송하는 경우에도
  동일 데이터가 중복 삽입되지 않도록 사용한다.

  구간별 평균 페이스는 별도 분석 테이블을 두지 않고
  point와 recorded_at을 이용하여 계산한다.
  '''
}

Table service.inquiries {
  idx integer [pk, increment]
  users_idx integer [not null]
  title varchar(200) [not null]
  content text [not null]
  status service.inquiry_status [not null, default: 'PENDING']
  answer text
  answerer_idx integer
  memo text
  created_at timestamptz [not null, default: `now()`]
  answered_at timestamptz

  indexes {
    users_idx
    answerer_idx
    status
    (users_idx, created_at)
    (status, created_at)
  }

  Note: '''
  answerer_idx는 service.users.idx를 참조한다.

  실제 답변 처리 시 해당 사용자의 role이 ADMIN인지
  서비스 로직에서 검증한다.

  ANSWERED 상태에서는 answer, answerer_idx,
  answered_at이 존재하도록 서비스 로직에서 검증한다.
  '''
}

/* Relationships */
Ref: service.user_profiles.users_idx > service.users.idx
Ref: service.running_goals.users_idx > service.users.idx
Ref: service.point_bookmarks.users_idx > service.users.idx
Ref: service.route_requests.users_idx > service.users.idx
Ref: service.route_request_points.route_requests_idx > service.route_requests.idx
Ref: service.route_recommendations.route_requests_idx > service.route_requests.idx
Ref: service.route_requests.selected_recommendations_idx >? service.route_recommendations.idx
Ref: service.route_points.route_recommendations_idx > service.route_recommendations.idx
Ref: service.route_bookmarks.users_idx > service.users.idx
Ref: service.route_bookmarks.route_recommendations_idx > service.route_recommendations.idx
Ref: service.running_sessions.users_idx > service.users.idx
Ref: service.running_sessions.route_recommendations_idx > service.route_recommendations.idx
Ref: service.running_trackpoints.running_sessions_idx > service.running_sessions.idx
Ref: service.inquiries.users_idx > service.users.idx
Ref: service.inquiries.answerer_idx >? service.users.idx
