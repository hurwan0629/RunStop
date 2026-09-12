from typing import Literal, NotRequired, TypeAlias, TypedDict


# 알고리즘에서 사용하는 WGS84 위도/경도 좌표쌍입니다.
Coordinate: TypeAlias = tuple[float, float]

# NetworkX 그래프 안에서 쓰는 노드 id입니다.
NodeId: TypeAlias = object

# 그래프 노드 id로 구성된 내부 경로입니다.
NodePath: TypeAlias = list[NodeId]

# 방향을 무시하고 비교하는 그래프 edge 키입니다.
EdgeKey: TypeAlias = frozenset[NodeId]

# 경로 중복 비교와 재사용 penalty에 쓰는 edge 집합입니다.
EdgeSet: TypeAlias = set[EdgeKey]

# API routeType을 내부 경로 생성 모드로 변환한 값입니다.
RouteMode: TypeAlias = Literal["loop", "point_to_point", "out_and_back", "via"]

# API 계층에서 받는 공개 경로 타입입니다.
RouteType: TypeAlias = Literal["LOOP", "ONE_WAY", "ROUND_TRIP"]

# 기능 이름별 사용자 선호 가중치입니다.
Weights: TypeAlias = dict[str, int]

# 계단 제외, 최대 경사 같은 필수 경로 조건입니다.
Requirements: TypeAlias = dict[str, bool | int | float]


# DEM 기반 경사와 고도 요약 정보입니다.
class ElevationProfile(TypedDict):
    # 경로 구간들의 평균 경사율입니다.
    avg_slope_pct: float | None
    # 경로 구간 중 가장 큰 경사율입니다.
    max_slope_pct: float | None
    # 경로 구간별 경사율의 표준편차입니다.
    slope_std_pct: float | None
    # 오르막 구간만 합산한 누적 상승 고도입니다.
    elevation_gain_m: float | None
    # 내리막 구간만 합산한 누적 하강 고도입니다.
    elevation_loss_m: float | None
    # 경사 계산에 사용된 샘플 좌표 개수입니다.
    sample_count: int


# 경로 주변 공원과 하천 인접 비율입니다.
class NatureProfile(TypedDict):
    # 경로 주변 버퍼 영역 중 공원과 겹치는 비율입니다.
    park_ratio: float | None
    # 경로 주변 버퍼 영역 중 하천과 겹치는 비율입니다.
    water_ratio: float | None


# OSM 기반 도로 환경 정보입니다.
class SurfaceProfile(TypedDict):
    # 분석에 사용된 전체 경로 길이입니다.
    length_m: float
    # 보행 친화 도로가 차지하는 길이 비율입니다.
    walkable_ratio: float | None
    # 대로 계열 도로가 차지하는 길이 비율입니다.
    bigroad_ratio: float | None
    # 경로에 포함된 계단 구간 개수입니다.
    stairs_count: int
    # 1km당 교통신호 노드 개수입니다.
    signal_per_km: float | None
    # 1km당 횡단보도 노드 개수입니다.
    crossing_per_km: float | None


# 시설 개수, 밀도, 최근접 거리 등에 쓰는 단일 값입니다.
FacilityMetricValue: TypeAlias = int | float | None

# 시설 이름별 개수, 밀도, 최근접 거리 지표입니다.
FacilityProfile: TypeAlias = dict[str, FacilityMetricValue]

# 점수 항목별 0~100 정규화 점수입니다.
SubScores: TypeAlias = dict[str, float | None]


# 후보 경로가 생성, 분석, 점수화 단계를 지나며 갖는 전체 구조입니다.
class CandidateRoute(TypedDict):
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #   1. 후보 경로 생성 직후 만들어지는 기본 경로 정보입니다.    #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # 내부 경로 생성 모드입니다.
    mode: RouteMode
    # 사용자가 요청한 목표 거리입니다.
    target_distance_m: float
    # 실제 생성된 경로 거리입니다.
    actual_distance_m: int
    # 목표 거리 대비 실제 거리 오차율입니다.
    distance_error_pct: float
    # 같은 edge를 반복해서 사용한 비율입니다.
    overlap_ratio: float
    # 목표 거리 보정을 위해 사용한 생성 스케일입니다.
    scale_m: int
    # 지도에 그릴 위도/경도 경로 좌표 목록입니다.
    coords: list[Coordinate]
    # 그래프 연산에 사용한 내부 노드 목록입니다.
    nodes: NotRequired[NodePath]

    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # 
    #   2. pipeline에서 경로를 분석하면서 추가되는 feature 정보입니다.   #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # 경사와 고도 분석 결과입니다.
    slope: NotRequired[ElevationProfile]
    # 경로 주변 시설 분석 결과입니다.
    facilities: NotRequired[FacilityProfile]
    # 자연 요소 인접도 분석 결과입니다.
    nature: NotRequired[NatureProfile]
    # 도로 환경 정보 분석 결과입니다.
    surface: NotRequired[SurfaceProfile]

    # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    #   3. scoring 단계에서 추가되는 점수와 조건 만족 정보입니다.  #
    # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
    # 기능별 세부 점수입니다.
    sub_scores: NotRequired[SubScores]
    # 사용자 가중치를 반영한 최종 점수입니다.
    condition_score: NotRequired[float]
    # 만족하지 못한 필수조건 목록입니다.
    failed_conditions: NotRequired[list[str]]
    # 모든 필수조건 만족 여부입니다.
    exact_match: NotRequired[bool]
    # 예상 소요 시간입니다.
    estimated_minutes: NotRequired[int]
