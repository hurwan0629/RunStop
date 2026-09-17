Table datasets.convenience_stores {
  idx integer [pk, increment]

  source_id bigint [not null, unique]

  name varchar [not null]
  district varchar

  road_address text
  lot_address text

  phone varchar

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  raw_data jsonb [
    note: '원본 CSV의 세부 컬럼 보존용'
  ]

  indexes {
    district
    point [type: gist]
  }
}


Table datasets.public_toilets {
  idx integer [pk, increment]

  source_id varchar [not null, unique]

  name varchar [not null]
  toilet_type varchar

  road_address text
  lot_address text

  management_agency varchar
  phone varchar

  opening_type varchar
  opening_detail varchar

  emergency_bell boolean
  entrance_cctv boolean

  point geometry [
    note: 'PostGIS geometry(Point, 4326). 원본 데이터 중 좌표 누락 행이 있어 NULL 허용'
  ]

  raw_data jsonb [
    note: '원본 CSV의 세부 컬럼 보존용'
  ]

  indexes {
    point [type: gist]
  }
}


Table datasets.streetlights {
  idx integer [pk, increment]

  management_id varchar [
    note: '원본 관리번호. 실제 데이터에 중복이 존재하므로 UNIQUE를 적용하지 않음'
  ]

  district varchar

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  raw_data jsonb [
    note: '원본 CSV의 세부 컬럼 보존용'
  ]

  indexes {
    district
    point [type: gist]
  }
}


Table datasets.security_lights {
  idx integer [pk, increment]

  name varchar

  installation_count integer

  district varchar

  road_address text
  lot_address text

  installation_year integer
  installation_type varchar

  management_agency varchar

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  raw_data jsonb [
    note: '원본 CSV의 세부 컬럼 보존용'
  ]

  indexes {
    district
    point [type: gist]
  }
}


Table datasets.cctvs {
  idx integer [pk, increment]

  source_id varchar [not null, unique]

  management_agency varchar

  road_address text
  lot_address text

  purpose varchar

  camera_count integer
  megapixels numeric
  retention_days integer

  point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326). Import 과정에서 서울 범위를 벗어나는 좌표 검증 필요'
  ]

  raw_data jsonb [
    note: '원본 CSV의 세부 컬럼 보존용'
  ]

  indexes {
    point [type: gist]
  }
}


Table datasets.parks {
  idx integer [pk, increment]

  source_id varchar [
    note: '원본 관리번호. 현재 기준 UNIQUE를 강제하지 않음'
  ]

  name varchar [not null]
  park_type varchar

  road_address text
  lot_address text

  area numeric

  point geometry [
    not null,
    note: '현재 정제 CSV는 공원 경계 Polygon이 아니라 대표 위경도만 제공하므로 geometry(Point, 4326) 사용'
  ]

  raw_data jsonb [
    note: '원본 CSV의 세부 컬럼 보존용'
  ]

  indexes {
    point [type: gist]
  }
}


Table datasets.pedestrian_roads {
  idx integer [pk, increment]

  name varchar [not null]

  district varchar
  neighborhood varchar

  operation_type varchar

  weekday_start_time time
  weekday_end_time time

  weekend_start_time time
  weekend_end_time time

  bicycle_shared_type varchar

  width numeric

  vehicle_pedestrian_separated boolean

  purpose varchar

  start_point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  end_point geometry [
    not null,
    note: 'PostGIS geometry(Point, 4326)'
  ]

  line geometry [
    note: 'PostGIS geometry(LineString, 4326). 현재 CSV는 실제 도로 Shape 전체가 아닌 시작/종료점 중심이므로 NULL 허용'
  ]

  raw_data jsonb [
    note: '원본 CSV의 세부 컬럼 보존용'
  ]

  indexes {
    district
    start_point [type: gist]
    end_point [type: gist]
    line [type: gist]
  }

  Note: '''
  운영방식구분이 전일제라고 해서 반드시 24시간 운영을 의미하지 않는다.
  실제 알고리즘에서는 평일/주말 시작·종료 시각을 함께 확인한다.

  실제 도로 굴곡 전체를 표현하는 LineString 데이터가 추가되기 전까지
  start_point와 end_point만으로 실제 도로 Shape를 단정하지 않는다.
  '''
}