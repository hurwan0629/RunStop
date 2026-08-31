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

Enum service.inquiry_status {
  PENDING
  IN_PROGRESS
  ANSWERED
}


Table service.users {
  idx integer [pk, increment]

  login_id varchar [not null, unique]
  password_hash varchar [not null]
  nickname varchar [not null]

  total_exp integer [not null, default: 0]
  role service.user_role [not null, default: 'USER']

  phone varchar

  status service.user_status [not null, default: 'ENABLED']

  suspended_until timestamp
  last_login_at timestamp

  created_at timestamp [not null]
  updated_at timestamp

  admin_memo text

  indexes {
    nickname
    phone
    status
  }
}


Table service.user_profiles {
  idx integer [pk, increment]

  users_idx integer [not null, unique]

  weight numeric
  height numeric

  running_settings jsonb

  profile_image_url varchar
}


Table service.running_goals {
  idx integer [pk, increment]

  users_idx integer [not null]

  goal_type service.goal_type [not null]
  target_distance numeric [not null]

  status service.goal_status [not null, default: 'ACTIVE']

  start_date date [not null]
  end_date date [not null]

  finished_at timestamp

  created_at timestamp [not null]

  indexes {
    users_idx
    (users_idx, status)
  }
}


Table service.point_bookmarks {
  idx integer [pk, increment]

  users_idx integer [not null]

  name varchar [not null]

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  indexes {
    users_idx
  }
}


Table service.route_requests {
  idx integer [pk, increment]

  users_idx integer [not null]

  prompt text

  element_conditions jsonb

  selected_recommendations_idx integer

  created_at timestamp [not null]

  indexes {
    users_idx
    selected_recommendations_idx
    created_at
  }

  Note: '''
  selected_recommendations_idx가 설정되는 경우
  해당 route_recommendation이 반드시 현재 route_request에서
  생성된 후보인지 서비스 로직에서 추가 검증한다.
  '''
}


Table service.route_request_points {
  idx integer [pk, increment]

  route_requests_idx integer [not null]

  sequence integer [not null]

  point_type service.route_point_type [not null]

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  indexes {
    route_requests_idx
    (route_requests_idx, sequence) [unique]
  }
}


Table service.route_recommendations {
  idx integer [pk, increment]

  route_requests_idx integer [not null]

  score numeric

  feature_scores jsonb
  feature_values jsonb

  total_distance numeric
  total_ascent numeric

  slope_std numeric [
    note: '경사도 표준편차. 알고리즘 정책 변경 시 elevation_std로 변경 가능'
  ]

  route geometry [
    not null,
    note: 'PostGIS geometry(LineString, 4326)'
  ]

  created_at timestamp [not null]

  indexes {
    route_requests_idx
    (route_requests_idx, score)
  }
}


Table service.route_points {
  idx integer [pk, increment]

  route_recommendations_idx integer [not null]

  sequence integer [not null]

  title varchar

  point_type service.route_point_type [not null]

  elevation numeric [
    note: '해당 지점의 고도(m)'
  ]

  slope numeric [
    note: '해당 지점의 경사도. % 또는 degree 중 하나의 단위로 통일'
  ]

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  indexes {
    route_recommendations_idx
    (route_recommendations_idx, sequence) [unique]
  }
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

  started_at timestamp [not null]
  finished_at timestamp

  average_pace numeric [
    note: '전체 평균 페이스. 초/km 등 하나의 단위로 통일'
  ]

  indexes {
    users_idx
    route_recommendations_idx
    started_at
  }
}


Table service.running_trackpoints {
  idx integer [pk, increment]

  running_sessions_idx integer [not null]

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  recorded_at timestamp [not null]

  accuracy numeric

  indexes {
    running_sessions_idx
    (running_sessions_idx, recorded_at)
  }
}


Table service.inquiries {
  idx integer [pk, increment]

  users_idx integer [not null]

  title varchar [not null]
  content text [not null]

  status service.inquiry_status [not null, default: 'PENDING']

  answer text

  answerer_idx integer

  memo text

  created_at timestamp [not null]
  answered_at timestamp

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


/*
Relationships
*/

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