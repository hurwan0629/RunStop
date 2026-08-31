# [데이터베이스 ERD] datasets 스키마

> 현재 정제 데이터와 migration 설계 기준으로 작성한 `datasets` 스키마 설명입니다.
>
> `datasets` 스키마는 편의점, 화장실, 조명, CCTV, 공원, 보행자전용도로 등  
> **경로 생성 및 Route Feature 계산에 사용하는 비교적 정적인 외부/공공 데이터**를 저장합니다.
>
> 현재 경사도 계산용 DEM 파일은 PostgreSQL에 넣지 않고 Python 측에서 별도로 사용하는 방향입니다.

---

## 공통 기준

- 공간 좌표계는 기본적으로 `EPSG:4326`을 사용한다.
- 시설 위치는 `geometry(Point, 4326)`을 사용한다.
- 보행자전용도로는 시작점 / 종료점을 `Point`로 저장하고, 실제 선형 데이터가 확보된 경우 `LineString`을 사용할 수 있도록 한다.
- 공간 조회가 필요한 geometry 컬럼에는 GiST 인덱스를 생성한다.
- 원본 CSV의 세부 컬럼을 모두 일반 컬럼으로 분리하지 않고, 필요한 경우 `raw_data jsonb`에 보존한다.
- `서울_시설데이터_통합.csv`는 개별 데이터의 파생 통합본이므로 별도 물리 테이블로 만들지 않는다.
- `보행자전용도로_전일제만.csv` 역시 원본 보행자전용도로의 파생 데이터이므로 별도 물리 테이블로 만들지 않는다.

---

## convenience_stores - 편의점

- idx: 식별자
- source_id: 원본 데이터 식별자
  - bigint
  - UNIQUE
  - NOT NULL
- name: 편의점 명칭
  - NOT NULL
- district: 자치구
- road_address: 도로명 주소
- lot_address: 지번 주소
- phone: 전화번호
- point: 편의점 위치
  - PostGIS `geometry(Point, 4326)`
  - NOT NULL
- raw_data: 원본 CSV의 세부 데이터
  - jsonb

인덱스:
- district
- point
  - GiST

---

## public_toilets - 공중화장실

- idx: 식별자
- source_id: 원본 관리번호
  - varchar
  - UNIQUE
  - NOT NULL
- name: 화장실 명칭
  - NOT NULL
- toilet_type: 화장실 유형
- road_address: 도로명 주소
- lot_address: 지번 주소
- management_agency: 관리기관
- phone: 전화번호
- opening_type: 개방 유형
- opening_detail: 개방시간 상세
- emergency_bell: 비상벨 여부
- entrance_cctv: 입구 CCTV 여부
- point: 화장실 위치
  - PostGIS `geometry(Point, 4326)`
  - 원본 데이터 중 좌표 누락 행이 있으므로 NULL 허용
- raw_data: 원본 CSV의 세부 데이터
  - jsonb

인덱스:
- point
  - GiST

공간 Feature 계산에서는 `point IS NOT NULL`인 데이터만 사용한다.

---

## streetlights - 가로등

- idx: 식별자
- management_id: 원본 관리번호
  - 실제 데이터에 중복이 존재하므로 UNIQUE를 적용하지 않음
- district: 자치구
- point: 가로등 위치
  - PostGIS `geometry(Point, 4326)`
  - NOT NULL
- raw_data: 원본 CSV의 세부 데이터
  - jsonb

인덱스:
- district
- point
  - GiST

---

## security_lights - 보안등

- idx: 식별자
- name: 보안등 명칭 또는 위치명
- installation_count: 설치 수량
- district: 자치구
- road_address: 도로명 주소
- lot_address: 지번 주소
- installation_year: 설치 연도
- installation_type: 설치 형태
- management_agency: 관리기관
- point: 보안등 위치
  - PostGIS `geometry(Point, 4326)`
  - NOT NULL
- raw_data: 원본 CSV의 세부 데이터
  - jsonb

인덱스:
- district
- point
  - GiST

---

## cctvs - CCTV

- idx: 식별자
- source_id: 원본 관리번호
  - varchar
  - UNIQUE
  - NOT NULL
- management_agency: 관리기관
- road_address: 도로명 주소
- lot_address: 지번 주소
- purpose: 설치 목적
- camera_count: 카메라 대수
- megapixels: 카메라 화소
- retention_days: 영상 보관일수
- point: CCTV 위치
  - PostGIS `geometry(Point, 4326)`
  - NOT NULL
- raw_data: 원본 CSV의 세부 데이터
  - jsonb

인덱스:
- point
  - GiST

Import 과정에서는 서울 지역 범위를 벗어나는 것으로 보이는 이상 좌표를 별도로 검증한다.

---

## parks - 도시공원

- idx: 식별자
- source_id: 원본 관리번호
  - 현재 기준 UNIQUE를 강제하지 않음
- name: 공원 명칭
  - NOT NULL
- park_type: 공원 유형
- road_address: 도로명 주소
- lot_address: 지번 주소
- area: 공원 면적
- point: 공원 대표 위치
  - PostGIS `geometry(Point, 4326)`
  - NOT NULL
- raw_data: 원본 CSV의 세부 데이터
  - jsonb

인덱스:
- point
  - GiST

현재 정제 CSV에는 공원 경계 Polygon이 아니라 대표 위도/경도만 존재하므로 `Point`로 저장한다.

향후 실제 공원 경계 SHP / GeoJSON 등의 Polygon 데이터가 확보되면 별도 migration을 통해 공간 컬럼 구조를 확장할 수 있다.

---

## pedestrian_roads - 보행자전용도로

- idx: 식별자
- name: 보행자전용도로 명칭
  - NOT NULL
- district: 자치구
- neighborhood: 읍면동 또는 세부 행정구역
- operation_type: 운영 방식
- weekday_start_time: 평일 운영 시작 시각
- weekday_end_time: 평일 운영 종료 시각
- weekend_start_time: 주말 운영 시작 시각
- weekend_end_time: 주말 운영 종료 시각
- bicycle_shared_type: 자전거 병행 여부 또는 관련 구분
- width: 도로 폭
- vehicle_pedestrian_separated: 차도 / 보행로 분리 여부
- purpose: 도로 용도
- start_point: 시작 위치
  - PostGIS `geometry(Point, 4326)`
  - NOT NULL
- end_point: 종료 위치
  - PostGIS `geometry(Point, 4326)`
  - NOT NULL
- line: 보행자전용도로 선형 공간 데이터
  - PostGIS `geometry(LineString, 4326)`
  - 현재 원본 데이터에는 실제 도로 Shape 전체가 존재하지 않으므로 NULL 허용
- raw_data: 원본 CSV의 세부 데이터
  - jsonb

인덱스:
- district
- start_point
  - GiST
- end_point
  - GiST
- line
  - GiST

주의사항:

- `운영방식구분 = 전일제`라고 해서 반드시 24시간 운영을 의미하지 않는다.
- 실제 경로 Feature 계산에서는 평일 / 주말 운영 시작·종료 시각을 함께 확인한다.
- 현재 CSV의 시작점과 종료점만을 연결해 만든 LineString을 실제 도로 굴곡 전체와 동일한 것으로 취급하지 않는다.

---

## 파생 데이터 처리 방향

### 서울_시설데이터_통합.csv

편의점, 화장실, 가로등, 보안등, CCTV, 공원 등의 공통 필드를 합친 파생 데이터이다.

개별 원본 테이블보다 정보가 줄어들기 때문에 `datasets` 스키마의 Source of Truth로 사용하지 않는다.

필요한 경우 다음과 같은 View 또는 Materialized View를 별도로 생성하는 방식으로 처리한다.

```text
datasets.facility_points
```

### 보행자전용도로_전일제만.csv

`pedestrian_roads`의 운영시간 조건을 이용해 파생 가능한 데이터이므로 별도 물리 테이블로 만들지 않는다.

필요하면 다음과 같은 View로 제공할 수 있다.

```text
datasets.pedestrian_roads_fulltime
```

단, `전일제` 값만으로 24시간 운영 여부를 판단하지 않고 실제 평일/주말 운영시간까지 확인한다.
