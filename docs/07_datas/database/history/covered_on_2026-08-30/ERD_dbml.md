Enum user_role {
  USER
  ADMIN
}

Enum auth_provider {
  GOOGLE
}

Enum goal_type {
  WEEKLY
  MONTHLY
}

Enum goal_status {
  ACTIVE
  SUCCESS
  FAILED
  STOPPED
}

Enum route_point_type {
  START
  WAYPOINT
  END
}


Table users {
  idx integer [pk, not null]
  nickname varchar
  total_exp integer [not null, default: 0]
  role user_role [not null, default: 'USER']
  created_at timestamp [not null]
  updated_at timestamp
}


Table user_auths {
  idx integer [pk, not null]
  user_idx integer [not null]
  provider auth_provider [not null, default: 'GOOGLE']
  provider_user_id varchar [not null, note: '현재 Google OIDC의 sub 저장']
  created_at timestamp [not null]

  indexes {
    (provider, provider_user_id) [unique]
  }
}


Table running_goal {
  idx integer [pk, not null]
  user_idx integer [not null]

  goal_type goal_type [not null]
  target_distance numeric [not null]

  status goal_status [not null, default: 'ACTIVE']

  start_date date [not null]
  end_date date [not null]

  finished_at timestamp

  created_at timestamp [not null]
}


Table route_requests {
  idx integer [pk, not null]
  user_idx integer [not null]

  prompt text
  element_conditions json

  selected_recommendation_idx integer

  created_at timestamp [not null]
}


Table route_recommendation {
  idx integer [pk, not null]
  route_requests_idx integer [not null]

  score numeric
  total_distance numeric
  total_ascent numeric

  geometry geometry [
    not null,
    note: 'PostGIS geometry(LineString, 4326)'
  ]

  created_at timestamp [not null]
}


Table route_point {
  idx integer [pk, not null]
  route_recommendation_idx integer [not null]

  sequence integer [not null]

  title varchar
  point_type route_point_type [not null]

  elevation numeric

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  indexes {
    (route_recommendation_idx, sequence) [unique]
  }
}


Table running_session {
  idx integer [pk, not null]

  user_idx integer [not null]
  route_recommendation_idx integer [not null]

  started_at timestamp [not null]
  finished_at timestamp

  average_pace numeric
}


Table running_trackpoint {
  idx integer [pk, not null]

  running_session_idx integer [not null]

  latitude numeric [not null]
  longitude numeric [not null]

  recorded_at timestamp [not null]

  accuracy numeric
}


/*
Relationships
*/

Ref: user_auths.user_idx > users.idx

Ref: running_goal.user_idx > users.idx

Ref: route_requests.user_idx > users.idx

Ref: route_recommendation.route_requests_idx > route_requests.idx

Ref: route_requests.selected_recommendation_idx >? route_recommendation.idx

Ref: route_point.route_recommendation_idx > route_recommendation.idx

Ref: running_session.user_idx > users.idx

Ref: running_session.route_recommendation_idx > route_recommendation.idx

Ref: running_trackpoint.running_session_idx > running_session.idx