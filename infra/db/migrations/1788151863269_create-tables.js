/**
 * RunStop DB migration
 *
 * service:
 * - 현재 service ERD 수정사항 반영
 * - route_recommendations.name 추가
 * - running_sessions.status / distance 추가
 * - profile_image_url 제거 (프로필 이미지는 프론트에서 처리)
 * - varchar / numeric 길이 및 정밀도 명시
 *
 * datasets:
 * - 기존 테이블/컬럼 구조 유지
 * - 범위가 없던 varchar / numeric에 길이 및 정밀도만 명시
 *
 * 전제:
 * - service / datasets schema는 이전 create-schema migration에서 생성되어 있음
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

const SERVICE = "service";
const DATASETS = "datasets";

const table = (schema, name) => ({
  schema,
  name,
});

const ref = (schema, name) => ({
  schema,
  name,
});


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {

  // =========================================================
  // PostGIS
  // =========================================================

  pgm.createExtension("postgis", {
    ifNotExists: true,
  });


  // =========================================================
  // service ENUM
  // =========================================================

  pgm.createType(
    table(SERVICE, "user_role"),
    ["USER", "ADMIN"]
  );

  pgm.createType(
    table(SERVICE, "user_status"),
    ["ENABLED", "SUSPENDED", "WITHDRAWN"]
  );

  pgm.createType(
    table(SERVICE, "goal_type"),
    ["WEEKLY", "MONTHLY"]
  );

  pgm.createType(
    table(SERVICE, "goal_status"),
    ["ACTIVE", "SUCCESS", "FAILED", "STOPPED"]
  );

  pgm.createType(
    table(SERVICE, "route_point_type"),
    ["START", "WAYPOINT", "END"]
  );

  pgm.createType(
    table(SERVICE, "running_session_status"),
    ["IN_PROGRESS", "COMPLETED", "STOPPED", "FAILED"]
  );

  pgm.createType(
    table(SERVICE, "inquiry_status"),
    ["PENDING", "IN_PROGRESS", "ANSWERED"]
  );


  // =========================================================
  // service.users
  // =========================================================

  pgm.createTable(table(SERVICE, "users"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    login_id: {
      type: "varchar(50)",
      notNull: true,
      unique: true,
    },

    // bcrypt는 현재 60자지만 향후 해시 포맷 변경 여유를 둔다.
    password_hash: {
      type: "varchar(255)",
      notNull: true,
    },

    nickname: {
      type: "varchar(30)",
      notNull: true,
    },

    total_exp: {
      type: "integer",
      notNull: true,
      default: 0,
    },

    role: {
      type: "service.user_role",
      notNull: true,
      default: "USER",
    },

    // 정규화된 전화번호 저장을 기준으로 충분한 여유를 둔다.
    phone: {
      type: "varchar(20)",
      unique: true,
    },

    status: {
      type: "service.user_status",
      notNull: true,
      default: "ENABLED",
    },

    suspended_until: {
      type: "timestamptz",
    },

    last_login_at: {
      type: "timestamptz",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },

    updated_at: {
      type: "timestamptz",
    },

    withdrawn_at: {
      type: "timestamptz",
    },

    admin_memo: {
      type: "text",
    },
  });

  pgm.createIndex(
    table(SERVICE, "users"),
    "nickname",
    {
      name: "idx_users_nickname",
    }
  );

  pgm.createIndex(
    table(SERVICE, "users"),
    "phone",
    {
      name: "idx_users_phone",
    }
  );

  pgm.createIndex(
    table(SERVICE, "users"),
    "status",
    {
      name: "idx_users_status",
    }
  );


  // =========================================================
  // service.user_profiles
  // =========================================================

  pgm.createTable(table(SERVICE, "user_profiles"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    users_idx: {
      type: "integer",
      notNull: true,
      unique: true,
      references: ref(SERVICE, "users"),
    },

    // kg / 최대 999.99
    weight: {
      type: "numeric(5,2)",
    },

    // cm / 최대 999.99
    height: {
      type: "numeric(5,2)",
    },

    // 거리: m
    // 경사: %
    running_settings: {
      type: "jsonb",
    },
  });


  // =========================================================
  // service.running_goals
  // =========================================================

  pgm.createTable(table(SERVICE, "running_goals"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    users_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "users"),
    },

    goal_type: {
      type: "service.goal_type",
      notNull: true,
    },

    // 단위: meter
    target_distance: {
      type: "integer",
      notNull: true,
    },

    status: {
      type: "service.goal_status",
      notNull: true,
      default: "ACTIVE",
    },

    start_date: {
      type: "date",
      notNull: true,
    },

    end_date: {
      type: "date",
      notNull: true,
    },

    finished_at: {
      type: "timestamptz",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex(
    table(SERVICE, "running_goals"),
    "users_idx",
    {
      name: "idx_running_goals_users",
    }
  );

  pgm.createIndex(
    table(SERVICE, "running_goals"),
    ["users_idx", "status"],
    {
      name: "idx_running_goals_users_status",
    }
  );


  // =========================================================
  // service.point_bookmarks
  // =========================================================

  pgm.createTable(table(SERVICE, "point_bookmarks"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    users_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "users"),
    },

    name: {
      type: "varchar(100)",
      notNull: true,
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },
  });

  pgm.createIndex(
    table(SERVICE, "point_bookmarks"),
    "users_idx",
    {
      name: "idx_point_bookmarks_users",
    }
  );

  pgm.createIndex(
    table(SERVICE, "point_bookmarks"),
    "point",
    {
      name: "idx_point_bookmarks_point_gist",
      method: "gist",
    }
  );


  // =========================================================
  // service.route_requests
  // =========================================================

  pgm.createTable(table(SERVICE, "route_requests"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    users_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "users"),
    },

    prompt: {
      type: "text",
    },

    // 권장 단위:
    // 거리 = m
    // 경사 = %
    // 시설 = count
    element_conditions: {
      type: "jsonb",
    },

    // route_recommendations 생성 후 FK를 추가한다.
    selected_recommendations_idx: {
      type: "integer",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_requests"),
    "users_idx",
    {
      name: "idx_route_requests_users",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_requests"),
    "selected_recommendations_idx",
    {
      name: "idx_route_requests_selected_recommendation",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_requests"),
    "created_at",
    {
      name: "idx_route_requests_created_at",
    }
  );


  // =========================================================
  // service.route_request_points
  // =========================================================

  pgm.createTable(table(SERVICE, "route_request_points"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    route_requests_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "route_requests"),
    },

    sequence: {
      type: "integer",
      notNull: true,
    },

    point_type: {
      type: "service.route_point_type",
      notNull: true,
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_request_points"),
    "route_requests_idx",
    {
      name: "idx_route_request_points_request",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_request_points"),
    ["route_requests_idx", "sequence"],
    {
      name: "uq_route_request_points_sequence",
      unique: true,
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_request_points"),
    "point",
    {
      name: "idx_route_request_points_point_gist",
      method: "gist",
    }
  );


  // =========================================================
  // service.route_recommendations
  // =========================================================

  pgm.createTable(table(SERVICE, "route_recommendations"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    route_requests_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "route_requests"),
    },

    // 러닝 기록 / 즐겨찾기 등에서 표시할 추천 코스 이름
    name: {
      type: "varchar(100)",
      notNull: true,
    },

    // 권장 점수 범위: 0 ~ 100
    // 예: 98.325
    score: {
      type: "numeric(6,3)",
    },

    // 각 Feature의 평가 점수
    // 권장: 각 점수 0 ~ 100
    feature_scores: {
      type: "jsonb",
    },

    // Feature 실제 계산값
    //
    // 예:
    // distance: m
    // slope: %
    // ascent: m
    // toilet_count: count
    // streetlight_density: count/km
    feature_values: {
      type: "jsonb",
    },

    // 단위: meter
    total_distance: {
      type: "integer",
    },

    // 단위: meter
    total_ascent: {
      type: "numeric(8,2)",
    },

    // 경사도 단위: %
    // slope 값들의 표준편차
    slope_std: {
      type: "numeric(7,3)",
    },

    route: {
      type: "geometry(LineString, 4326)",
      notNull: true,
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_recommendations"),
    "route_requests_idx",
    {
      name: "idx_route_recommendations_request",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_recommendations"),
    ["route_requests_idx", "score"],
    {
      name: "idx_route_recommendations_request_score",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_recommendations"),
    "route",
    {
      name: "idx_route_recommendations_route_gist",
      method: "gist",
    }
  );


  // =========================================================
  // route_requests ↔ route_recommendations 순환 FK
  // =========================================================

  pgm.sql(`
    ALTER TABLE service.route_requests
    ADD CONSTRAINT fk_route_requests_selected_recommendation
    FOREIGN KEY (selected_recommendations_idx)
    REFERENCES service.route_recommendations(idx);
  `);


  // =========================================================
  // service.route_points
  // =========================================================

  pgm.createTable(table(SERVICE, "route_points"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    route_recommendations_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "route_recommendations"),
    },

    sequence: {
      type: "integer",
      notNull: true,
    },

    title: {
      type: "varchar(100)",
    },

    point_type: {
      type: "service.route_point_type",
      notNull: true,
    },

    // 단위: meter
    elevation: {
      type: "numeric(8,2)",
    },

    // 단위: percent (%)
    slope: {
      type: "numeric(7,3)",
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_points"),
    "route_recommendations_idx",
    {
      name: "idx_route_points_recommendation",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_points"),
    ["route_recommendations_idx", "sequence"],
    {
      name: "uq_route_points_sequence",
      unique: true,
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_points"),
    "point",
    {
      name: "idx_route_points_point_gist",
      method: "gist",
    }
  );


  // =========================================================
  // service.route_bookmarks
  // =========================================================

  pgm.createTable(table(SERVICE, "route_bookmarks"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    users_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "users"),
    },

    route_recommendations_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "route_recommendations"),
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_bookmarks"),
    "users_idx",
    {
      name: "idx_route_bookmarks_users",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_bookmarks"),
    "route_recommendations_idx",
    {
      name: "idx_route_bookmarks_recommendation",
    }
  );

  pgm.createIndex(
    table(SERVICE, "route_bookmarks"),
    ["users_idx", "route_recommendations_idx"],
    {
      name: "uq_route_bookmarks_user_route",
      unique: true,
    }
  );


  // =========================================================
  // service.running_sessions
  // =========================================================

  pgm.createTable(table(SERVICE, "running_sessions"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    users_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "users"),
    },

    route_recommendations_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "route_recommendations"),
    },

    status: {
      type: "service.running_session_status",
      notNull: true,
      default: "IN_PROGRESS",
    },

    started_at: {
      type: "timestamptz",
      notNull: true,
    },

    finished_at: {
      type: "timestamptz",
    },

    // 실제 GPS trackpoint 집계 거리
    // 단위: meter
    // 진행 중에는 NULL 가능
    distance: {
      type: "integer",
    },

    // 단위: sec/km
    // 예: 5분 23초/km = 323
    average_pace: {
      type: "integer",
    },
  });

  pgm.createIndex(
    table(SERVICE, "running_sessions"),
    "users_idx",
    {
      name: "idx_running_sessions_users",
    }
  );

  pgm.createIndex(
    table(SERVICE, "running_sessions"),
    "route_recommendations_idx",
    {
      name: "idx_running_sessions_recommendation",
    }
  );

  pgm.createIndex(
    table(SERVICE, "running_sessions"),
    "started_at",
    {
      name: "idx_running_sessions_started_at",
    }
  );


  // =========================================================
  // service.running_trackpoints
  // =========================================================

  pgm.createTable(table(SERVICE, "running_trackpoints"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    // 클라이언트에서 생성
    // 재전송 시 중복 저장 방지
    client_trackpoint_id: {
      type: "uuid",
      notNull: true,
      unique: true,
    },

    running_sessions_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "running_sessions"),
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    recorded_at: {
      type: "timestamptz",
      notNull: true,
    },

    // GPS accuracy
    // 단위: meter
    accuracy: {
      type: "numeric(8,2)",
    },
  });

  pgm.createIndex(
    table(SERVICE, "running_trackpoints"),
    "running_sessions_idx",
    {
      name: "idx_running_trackpoints_session",
    }
  );

  // UNIQUE 자체가 B-tree index를 만들지만
  // 기존 ERD / migration 구조를 유지한다.
  pgm.createIndex(
    table(SERVICE, "running_trackpoints"),
    "client_trackpoint_id",
    {
      name: "idx_running_trackpoints_client_trackpoint_id",
    }
  );

  pgm.createIndex(
    table(SERVICE, "running_trackpoints"),
    ["running_sessions_idx", "recorded_at"],
    {
      name: "idx_running_trackpoints_session_time",
    }
  );

  pgm.createIndex(
    table(SERVICE, "running_trackpoints"),
    "point",
    {
      name: "idx_running_trackpoints_point_gist",
      method: "gist",
    }
  );


  // =========================================================
  // service.inquiries
  // =========================================================

  pgm.createTable(table(SERVICE, "inquiries"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    users_idx: {
      type: "integer",
      notNull: true,
      references: ref(SERVICE, "users"),
    },

    title: {
      type: "varchar(200)",
      notNull: true,
    },

    content: {
      type: "text",
      notNull: true,
    },

    status: {
      type: "service.inquiry_status",
      notNull: true,
      default: "PENDING",
    },

    answer: {
      type: "text",
    },

    answerer_idx: {
      type: "integer",
      references: ref(SERVICE, "users"),
    },

    memo: {
      type: "text",
    },

    created_at: {
      type: "timestamptz",
      notNull: true,
      default: pgm.func("now()"),
    },

    answered_at: {
      type: "timestamptz",
    },
  });

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    "users_idx",
    {
      name: "idx_inquiries_users",
    }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    "answerer_idx",
    {
      name: "idx_inquiries_answerer",
    }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    "status",
    {
      name: "idx_inquiries_status",
    }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    ["users_idx", "created_at"],
    {
      name: "idx_inquiries_user_created",
    }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    ["status", "created_at"],
    {
      name: "idx_inquiries_status_created",
    }
  );


  // =========================================================
  // datasets
  //
  // 기존 테이블 / 컬럼 구조는 유지하고
  // varchar / numeric 범위만 명시한다.
  // =========================================================


  // ---------------------------------------------------------
  // 편의점
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "convenience_stores"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    source_id: {
      type: "bigint",
      notNull: true,
      unique: true,
    },

    name: {
      type: "varchar(200)",
      notNull: true,
    },

    district: {
      type: "varchar(50)",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    phone: {
      type: "varchar(30)",
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    raw_data: {
      type: "jsonb",
    },
  });

  pgm.createIndex(
    table(DATASETS, "convenience_stores"),
    "district",
    {
      name: "idx_convenience_stores_district",
    }
  );

  pgm.createIndex(
    table(DATASETS, "convenience_stores"),
    "point",
    {
      name: "idx_convenience_stores_point_gist",
      method: "gist",
    }
  );


  // ---------------------------------------------------------
  // 공중화장실
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "public_toilets"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    source_id: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },

    name: {
      type: "varchar(200)",
      notNull: true,
    },

    toilet_type: {
      type: "varchar(50)",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    management_agency: {
      type: "varchar(200)",
    },

    phone: {
      type: "varchar(30)",
    },

    opening_type: {
      type: "varchar(100)",
    },

    opening_detail: {
      type: "varchar(500)",
    },

    emergency_bell: {
      type: "boolean",
    },

    entrance_cctv: {
      type: "boolean",
    },

    // 좌표 누락 데이터가 존재할 수 있으므로 nullable
    point: {
      type: "geometry(Point, 4326)",
    },

    raw_data: {
      type: "jsonb",
    },
  });

  pgm.createIndex(
    table(DATASETS, "public_toilets"),
    "point",
    {
      name: "idx_public_toilets_point_gist",
      method: "gist",
    }
  );


  // ---------------------------------------------------------
  // 가로등
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "streetlights"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    // 실제 데이터에 중복 존재
    management_id: {
      type: "varchar(100)",
    },

    district: {
      type: "varchar(50)",
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    raw_data: {
      type: "jsonb",
    },
  });

  pgm.createIndex(
    table(DATASETS, "streetlights"),
    "district",
    {
      name: "idx_streetlights_district",
    }
  );

  pgm.createIndex(
    table(DATASETS, "streetlights"),
    "point",
    {
      name: "idx_streetlights_point_gist",
      method: "gist",
    }
  );


  // ---------------------------------------------------------
  // 보안등
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "security_lights"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    name: {
      type: "varchar(200)",
    },

    installation_count: {
      type: "integer",
    },

    district: {
      type: "varchar(50)",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    installation_year: {
      type: "integer",
    },

    installation_type: {
      type: "varchar(100)",
    },

    management_agency: {
      type: "varchar(200)",
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    raw_data: {
      type: "jsonb",
    },
  });

  pgm.createIndex(
    table(DATASETS, "security_lights"),
    "district",
    {
      name: "idx_security_lights_district",
    }
  );

  pgm.createIndex(
    table(DATASETS, "security_lights"),
    "point",
    {
      name: "idx_security_lights_point_gist",
      method: "gist",
    }
  );


  // ---------------------------------------------------------
  // CCTV
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "cctvs"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    source_id: {
      type: "varchar(100)",
      notNull: true,
      unique: true,
    },

    management_agency: {
      type: "varchar(200)",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    purpose: {
      type: "varchar(200)",
    },

    camera_count: {
      type: "integer",
    },

    // 최대 999999.99 megapixel 표현 가능
    megapixels: {
      type: "numeric(8,2)",
    },

    retention_days: {
      type: "integer",
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    raw_data: {
      type: "jsonb",
    },
  });

  pgm.createIndex(
    table(DATASETS, "cctvs"),
    "point",
    {
      name: "idx_cctvs_point_gist",
      method: "gist",
    }
  );


  // ---------------------------------------------------------
  // 도시공원
  //
  // 현재 CSV에는 Polygon 경계가 없고 위/경도만 존재
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "parks"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    source_id: {
      type: "varchar(100)",
    },

    name: {
      type: "varchar(200)",
      notNull: true,
    },

    park_type: {
      type: "varchar(100)",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    // 공원 면적. 소수 둘째 자리까지 저장
    area: {
      type: "numeric(14,2)",
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    raw_data: {
      type: "jsonb",
    },
  });

  pgm.createIndex(
    table(DATASETS, "parks"),
    "point",
    {
      name: "idx_parks_point_gist",
      method: "gist",
    }
  );


  // ---------------------------------------------------------
  // 보행자전용도로
  //
  // 현재 데이터는 실제 전체 도로 shape가 아니라
  // 시작점 / 종료점을 제공함
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "pedestrian_roads"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    name: {
      type: "varchar(200)",
      notNull: true,
    },

    district: {
      type: "varchar(50)",
    },

    neighborhood: {
      type: "varchar(100)",
    },

    operation_type: {
      type: "varchar(100)",
    },

    weekday_start_time: {
      type: "time",
    },

    weekday_end_time: {
      type: "time",
    },

    weekend_start_time: {
      type: "time",
    },

    weekend_end_time: {
      type: "time",
    },

    bicycle_shared_type: {
      type: "varchar(100)",
    },

    // 도로 폭. 단위는 원천 데이터 기준 meter
    width: {
      type: "numeric(8,2)",
    },

    vehicle_pedestrian_separated: {
      type: "boolean",
    },

    purpose: {
      type: "varchar(200)",
    },

    start_point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    end_point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },

    line: {
      type: "geometry(LineString, 4326)",
    },

    raw_data: {
      type: "jsonb",
    },
  });

  pgm.createIndex(
    table(DATASETS, "pedestrian_roads"),
    "district",
    {
      name: "idx_pedestrian_roads_district",
    }
  );

  pgm.createIndex(
    table(DATASETS, "pedestrian_roads"),
    "start_point",
    {
      name: "idx_pedestrian_roads_start_gist",
      method: "gist",
    }
  );

  pgm.createIndex(
    table(DATASETS, "pedestrian_roads"),
    "end_point",
    {
      name: "idx_pedestrian_roads_end_gist",
      method: "gist",
    }
  );

  pgm.createIndex(
    table(DATASETS, "pedestrian_roads"),
    "line",
    {
      name: "idx_pedestrian_roads_line_gist",
      method: "gist",
    }
  );
};


/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {

  // =========================================================
  // datasets
  // =========================================================

  pgm.dropTable(
    table(DATASETS, "pedestrian_roads")
  );

  pgm.dropTable(
    table(DATASETS, "parks")
  );

  pgm.dropTable(
    table(DATASETS, "cctvs")
  );

  pgm.dropTable(
    table(DATASETS, "security_lights")
  );

  pgm.dropTable(
    table(DATASETS, "streetlights")
  );

  pgm.dropTable(
    table(DATASETS, "public_toilets")
  );

  pgm.dropTable(
    table(DATASETS, "convenience_stores")
  );


  // =========================================================
  // service
  // =========================================================

  // route_requests ↔ route_recommendations 순환 FK를
  // 먼저 제거해야 테이블 삭제 가능
  pgm.sql(`
    ALTER TABLE service.route_requests
    DROP CONSTRAINT IF EXISTS fk_route_requests_selected_recommendation;
  `);


  pgm.dropTable(
    table(SERVICE, "inquiries")
  );

  pgm.dropTable(
    table(SERVICE, "running_trackpoints")
  );

  pgm.dropTable(
    table(SERVICE, "running_sessions")
  );

  pgm.dropTable(
    table(SERVICE, "route_bookmarks")
  );

  pgm.dropTable(
    table(SERVICE, "route_points")
  );

  pgm.dropTable(
    table(SERVICE, "route_request_points")
  );

  pgm.dropTable(
    table(SERVICE, "route_recommendations")
  );

  pgm.dropTable(
    table(SERVICE, "route_requests")
  );

  pgm.dropTable(
    table(SERVICE, "point_bookmarks")
  );

  pgm.dropTable(
    table(SERVICE, "running_goals")
  );

  pgm.dropTable(
    table(SERVICE, "user_profiles")
  );

  pgm.dropTable(
    table(SERVICE, "users")
  );


  // =========================================================
  // ENUM
  // =========================================================

  pgm.dropType(
    table(SERVICE, "inquiry_status")
  );

  pgm.dropType(
    table(SERVICE, "running_session_status")
  );

  pgm.dropType(
    table(SERVICE, "route_point_type")
  );

  pgm.dropType(
    table(SERVICE, "goal_status")
  );

  pgm.dropType(
    table(SERVICE, "goal_type")
  );

  pgm.dropType(
    table(SERVICE, "user_status")
  );

  pgm.dropType(
    table(SERVICE, "user_role")
  );


  // PostGIS extension은 DB 공용 기능이므로 제거하지 않는다.
};