/**
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
      type: "varchar",
      notNull: true,
      unique: true,
    },

    password_hash: {
      type: "varchar",
      notNull: true,
    },

    nickname: {
      type: "varchar",
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

    phone: {
      type: "varchar",
    },

    status: {
      type: "service.user_status",
      notNull: true,
      default: "ENABLED",
    },

    suspended_until: {
      type: "timestamp",
    },

    last_login_at: {
      type: "timestamp",
    },

    created_at: {
      type: "timestamp",
      notNull: true,
    },

    updated_at: {
      type: "timestamp",
    },

    admin_memo: {
      type: "text",
    },
  });

  pgm.createIndex(
    table(SERVICE, "users"),
    "nickname",
    { name: "idx_users_nickname" }
  );

  pgm.createIndex(
    table(SERVICE, "users"),
    "phone",
    { name: "idx_users_phone" }
  );

  pgm.createIndex(
    table(SERVICE, "users"),
    "status",
    { name: "idx_users_status" }
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

    weight: {
      type: "numeric",
    },

    height: {
      type: "numeric",
    },

    running_settings: {
      type: "jsonb",
    },

    profile_image_url: {
      type: "varchar",
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

    target_distance: {
      type: "numeric",
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
      type: "timestamp",
    },

    created_at: {
      type: "timestamp",
      notNull: true,
    },
  });

  pgm.createIndex(
    table(SERVICE, "running_goals"),
    "users_idx",
    { name: "idx_running_goals_users" }
  );

  pgm.createIndex(
    table(SERVICE, "running_goals"),
    ["users_idx", "status"],
    { name: "idx_running_goals_users_status" }
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
      type: "varchar",
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
    { name: "idx_point_bookmarks_users" }
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

    element_conditions: {
      type: "jsonb",
    },

    // route_recommendations 생성 후 FK를 추가한다.
    selected_recommendations_idx: {
      type: "integer",
    },

    created_at: {
      type: "timestamp",
      notNull: true,
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_requests"),
    "users_idx",
    { name: "idx_route_requests_users" }
  );

  pgm.createIndex(
    table(SERVICE, "route_requests"),
    "selected_recommendations_idx",
    { name: "idx_route_requests_selected_recommendation" }
  );

  pgm.createIndex(
    table(SERVICE, "route_requests"),
    "created_at",
    { name: "idx_route_requests_created_at" }
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
    { name: "idx_route_request_points_request" }
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

    score: {
      type: "numeric",
    },

    feature_scores: {
      type: "jsonb",
    },

    feature_values: {
      type: "jsonb",
    },

    total_distance: {
      type: "numeric",
    },

    total_ascent: {
      type: "numeric",
    },

    slope_std: {
      type: "numeric",
    },

    route: {
      type: "geometry(LineString, 4326)",
      notNull: true,
    },

    created_at: {
      type: "timestamp",
      notNull: true,
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_recommendations"),
    "route_requests_idx",
    { name: "idx_route_recommendations_request" }
  );

  pgm.createIndex(
    table(SERVICE, "route_recommendations"),
    ["route_requests_idx", "score"],
    { name: "idx_route_recommendations_request_score" }
  );

  pgm.createIndex(
    table(SERVICE, "route_recommendations"),
    "route",
    {
      name: "idx_route_recommendations_route_gist",
      method: "gist",
    }
  );


  // route_requests ↔ route_recommendations 순환 FK
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
      type: "varchar",
    },

    point_type: {
      type: "service.route_point_type",
      notNull: true,
    },

    elevation: {
      type: "numeric",
    },

    slope: {
      type: "numeric",
    },

    point: {
      type: "geometry(Point, 4326)",
      notNull: true,
    },
  });

  pgm.createIndex(
    table(SERVICE, "route_points"),
    "route_recommendations_idx",
    { name: "idx_route_points_recommendation" }
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
    { name: "idx_route_bookmarks_users" }
  );

  pgm.createIndex(
    table(SERVICE, "route_bookmarks"),
    "route_recommendations_idx",
    { name: "idx_route_bookmarks_recommendation" }
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

    started_at: {
      type: "timestamp",
      notNull: true,
    },

    finished_at: {
      type: "timestamp",
    },

    average_pace: {
      type: "numeric",
    },
  });

  pgm.createIndex(
    table(SERVICE, "running_sessions"),
    "users_idx",
    { name: "idx_running_sessions_users" }
  );

  pgm.createIndex(
    table(SERVICE, "running_sessions"),
    "route_recommendations_idx",
    { name: "idx_running_sessions_recommendation" }
  );

  pgm.createIndex(
    table(SERVICE, "running_sessions"),
    "started_at",
    { name: "idx_running_sessions_started_at" }
  );


  // =========================================================
  // service.running_trackpoints
  // =========================================================

  pgm.createTable(table(SERVICE, "running_trackpoints"), {
    idx: {
      type: "serial",
      primaryKey: true,
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
      type: "timestamp",
      notNull: true,
    },

    accuracy: {
      type: "numeric",
    },
  });

  pgm.createIndex(
    table(SERVICE, "running_trackpoints"),
    "running_sessions_idx",
    { name: "idx_running_trackpoints_session" }
  );

  pgm.createIndex(
    table(SERVICE, "running_trackpoints"),
    ["running_sessions_idx", "recorded_at"],
    { name: "idx_running_trackpoints_session_time" }
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
      type: "varchar",
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
      type: "timestamp",
      notNull: true,
    },

    answered_at: {
      type: "timestamp",
    },
  });

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    "users_idx",
    { name: "idx_inquiries_users" }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    "answerer_idx",
    { name: "idx_inquiries_answerer" }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    "status",
    { name: "idx_inquiries_status" }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    ["users_idx", "created_at"],
    { name: "idx_inquiries_user_created" }
  );

  pgm.createIndex(
    table(SERVICE, "inquiries"),
    ["status", "created_at"],
    { name: "idx_inquiries_status_created" }
  );


  // =========================================================
  // datasets
  //
  // 세부 원본 필드는 raw_data에 보존하고
  // 알고리즘에서 자주 사용하는 필드만 일반 컬럼으로 분리.
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
      type: "varchar",
      notNull: true,
    },

    district: {
      type: "varchar",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    phone: {
      type: "varchar",
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
    { name: "idx_convenience_stores_district" }
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
      type: "varchar",
      notNull: true,
      unique: true,
    },

    name: {
      type: "varchar",
      notNull: true,
    },

    toilet_type: {
      type: "varchar",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    management_agency: {
      type: "varchar",
    },

    phone: {
      type: "varchar",
    },

    opening_type: {
      type: "varchar",
    },

    opening_detail: {
      type: "varchar",
    },

    emergency_bell: {
      type: "boolean",
    },

    entrance_cctv: {
      type: "boolean",
    },

    // 좌표 누락 행이 존재할 수 있으므로 nullable
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
  // 관리번호 중복이 실제 데이터에 존재하므로 UNIQUE 아님.
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "streetlights"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    management_id: {
      type: "varchar",
    },

    district: {
      type: "varchar",
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
    { name: "idx_streetlights_district" }
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
      type: "varchar",
    },

    installation_count: {
      type: "integer",
    },

    district: {
      type: "varchar",
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
      type: "varchar",
    },

    management_agency: {
      type: "varchar",
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
    { name: "idx_security_lights_district" }
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
      type: "varchar",
      notNull: true,
      unique: true,
    },

    management_agency: {
      type: "varchar",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    purpose: {
      type: "varchar",
    },

    camera_count: {
      type: "integer",
    },

    megapixels: {
      type: "numeric",
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
  // 현재 CSV에는 공원 Polygon 경계가 없고 위/경도만 있음.
  // 따라서 실제 보유 데이터 기준 Point로 저장.
  // Polygon 자료가 추가되면 별도 migration에서 변경.
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "parks"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    source_id: {
      type: "varchar",
    },

    name: {
      type: "varchar",
      notNull: true,
    },

    park_type: {
      type: "varchar",
    },

    road_address: {
      type: "text",
    },

    lot_address: {
      type: "text",
    },

    area: {
      type: "numeric",
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
  // CSV가 실제 도로 shape 전체가 아니라 시작/종료점만 제공.
  // line은 nullable로 두고 import 과정에서 정책을 결정.
  // ---------------------------------------------------------

  pgm.createTable(table(DATASETS, "pedestrian_roads"), {
    idx: {
      type: "serial",
      primaryKey: true,
    },

    name: {
      type: "varchar",
      notNull: true,
    },

    district: {
      type: "varchar",
    },

    neighborhood: {
      type: "varchar",
    },

    operation_type: {
      type: "varchar",
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
      type: "varchar",
    },

    width: {
      type: "numeric",
    },

    vehicle_pedestrian_separated: {
      type: "boolean",
    },

    purpose: {
      type: "varchar",
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
    { name: "idx_pedestrian_roads_district" }
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

  pgm.dropTable(table(DATASETS, "pedestrian_roads"));
  pgm.dropTable(table(DATASETS, "parks"));
  pgm.dropTable(table(DATASETS, "cctvs"));
  pgm.dropTable(table(DATASETS, "security_lights"));
  pgm.dropTable(table(DATASETS, "streetlights"));
  pgm.dropTable(table(DATASETS, "public_toilets"));
  pgm.dropTable(table(DATASETS, "convenience_stores"));


  // =========================================================
  // service
  // =========================================================

  // 순환 FK 먼저 제거
  pgm.sql(`
    ALTER TABLE service.route_requests
    DROP CONSTRAINT IF EXISTS fk_route_requests_selected_recommendation;
  `);

  pgm.dropTable(table(SERVICE, "inquiries"));
  pgm.dropTable(table(SERVICE, "running_trackpoints"));
  pgm.dropTable(table(SERVICE, "running_sessions"));
  pgm.dropTable(table(SERVICE, "route_bookmarks"));
  pgm.dropTable(table(SERVICE, "route_points"));
  pgm.dropTable(table(SERVICE, "route_request_points"));
  pgm.dropTable(table(SERVICE, "route_recommendations"));
  pgm.dropTable(table(SERVICE, "route_requests"));
  pgm.dropTable(table(SERVICE, "point_bookmarks"));
  pgm.dropTable(table(SERVICE, "running_goals"));
  pgm.dropTable(table(SERVICE, "user_profiles"));
  pgm.dropTable(table(SERVICE, "users"));


  // =========================================================
  // ENUM
  // =========================================================

  pgm.dropType(table(SERVICE, "inquiry_status"));
  pgm.dropType(table(SERVICE, "route_point_type"));
  pgm.dropType(table(SERVICE, "goal_status"));
  pgm.dropType(table(SERVICE, "goal_type"));
  pgm.dropType(table(SERVICE, "user_status"));
  pgm.dropType(table(SERVICE, "user_role"));

  // PostGIS extension은 DB 공용 기능이라 제거하지 않음.
};