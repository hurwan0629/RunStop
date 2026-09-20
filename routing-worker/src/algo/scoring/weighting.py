"""
후보 코스의 원시 feature -> 0~100 소점수(sub_scores) -> 사용자 가중치로 conditionScore.
필수조건(requirements) 미충족은 failedConditions 로 표시하되 후보는 버리지 않는다.

입력 candidate 는 course + elevation(slope) + scoring(facilities) + nature + surface 가
붙은 상태여야 한다 (pipeline.recommend 가 순서대로 붙임).

정규화는 절대 기준 곡선 (후보가 3개뿐이라 min-max 는 불안정). 임계값은 아래 상수.
"""

# ── 0점 ↔ 100점 기준 (튜닝 포인트) ─────────────────────────────
from src.algo.types import CandidateRoute, Requirements, SubScores, Weights
from src.algo import config

DIST_ERR_ZERO_PCT   = 10.0    # 거리 오차 10% -> 0점, 0% -> 100점
# [유지] DIST_TOLERANCE_PCT/config.CAND_DIST_TOL_PCT와 값을 맞춰둔 것 — 임의로 바꾸면 하드컷·점수 레이어가 어긋남

GAIN_PER_KM_ZERO    = 30.0    # 1km당 오르막 30m -> 0점, 0m -> 100점
# [유지] Valhalla엔 대응 지표 없음(경사를 factor가 아닌 grade-bucket으로 처리). 실사용 로그 확보 후 LTR로 재조정 대상

ELEVATION_NEUTRAL   = 50.0    # DEM 없을 때 경사 소점수 (중립)
# [유지] DEM 부재 시 중립값 50은 0/100 어느 쪽에도 치우치지 않아 구조적으로 타당

TOILET_FULL         = 3       # 화장실 이 개수 이상이면 개수점 만점
# [실측 튜닝] 서울 표본 N=40 출발점/120 후보(3km loop) 기준 toilet_per_km median=1.05 -> 3km 환산 ~3.1. 기존 2는 median보다도 낮아 절반 이상 코스가 항상 만점 처리됨
STORE_FULL          = 7
# [실측 튜닝] 동일 표본 store_per_km median=2.37 -> 3km 환산 ~7.1. 기존 3은 median의 절반 이하라 거의 모든 코스가 상시 만점(사실상 죽은 지표)이었음
NEAR_OK_M           = 100.0   # 시설 최근접 이 거리까지는 감점 없음
NEAR_PENALTY_SPAN_M   = 100.0  # 이 거리마다 아래 점수씩 추가 감점
NEAR_PENALTY_PER_SPAN = 20.0   # 스팬당 감점
NEAR_PENALTY_MAX      = 40.0   # 근접 감점 총상한
# [유지] 최근접거리(_nearest_m) 분포는 이번 실측에서 수집하지 않음 — 표본 확장 시 재검토

PARK_RATIO_FULL     = 0.15    # 녹지 인접률 15% -> 100점
# [실측 검증] 동일 표본 park_ratio p90=0.21로 기존값이 p75(0.074)~p90 사이 — 이미 "상위권만 만점"인 합리적 위치, 유지
WATER_RATIO_FULL    = 0.05    # 하천 인접률 5% -> 100점
# [실측 튜닝] 동일 표본 water_ratio median=0, p90=0.012, 관측 최댓값=0.081 — 기존 0.15는 표본 전체 관측 최댓값보다도 높아 사실상 도달 불가능(만년 0점)했음. p90의 대략 4배 여유를 둔 0.05로 하향
STREETLIGHT_PER_KM_FULL = 120.0  # (가로등+보안등+보행등)/km — 서울 도심은 대부분 포화
# [실측 검증] streetlight_per_km p90=97.2, 관측 최댓값=139.6 — 기존값이 p90~최댓값 사이로 이미 "도전적이되 도달 가능"한 위치, 유지
CCTV_PER_KM_FULL    = 15.0
# [실측 검증] cctv_per_km p75=17.2로 기존값이 p75 근접 — 이미 합리적, 유지
WALKABLE_FULL       = 0.90    # 보행자친화 길이비율 90% -> 100점 기여
# [실측 튜닝] 동일 표본 walkable_ratio p25=0.791, median=0.899 — 기존 0.60은 관측 25th percentile보다도 낮아 거의 모든 코스가 상시 만점(사실상 죽은 지표)이었음. median 근처인 0.90으로 상향
BIGROAD_ZERO        = 0.30    # 큰길 비율 30% -> 큰길 감점 최대
# [실측 검증] bigroad_ratio p90=0.36로 기존값이 p75(0.22)~p90 사이 — 이미 "하위권만 0점"인 합리적 위치, 유지
BIGROAD_PENALTY_MAX = 40.0    # 큰길 감점 상한 (= 스케일 계수)
# [유지] 이미 공격적인 감점 설계(대로 30%만 노출돼도 최대 40점 감점)로 Valhalla의 "회피는 세게" 원칙과 부합
STAIRS_PENALTY      = 15.0    # 계단 1개당 노면점 -15
# [유지] 이미 "개수당 고정 감점"(길이 무관) 구조로 Valhalla step_penalty 철학과 일치
SIGNAL_PER_KM_ZERO  = 1.0     # 신호등 1개/km -> 0점, 0 -> 100점
# [실측 튜닝] 동일 표본 signal_per_km p90=0.68, 관측 최댓값=3.24(40표본) — 기존 4.0은 관측 최댓값보다도 높아 사실상 항상 고득점(사실상 죽은 지표)이었음. p90에 여유를 둔 1.0으로 하향
OVERLAP_ZERO        = 0.30    # 겹침 0.30 -> 0점, 0 -> 100점
# [유지] point-to-point 라우팅 엔진엔 없는 RunStop 고유 지표라 참고자료·이번 실측 대상 모두 아님
PACE_MIN_PER_KM     = 6.0     # 예상 소요시간용
# [유지] 라우팅 엔진 참고자료와 무관한 제품(러닝 페이스) 파라미터
DEFAULT_WEIGHT      = 3       # 사용자 가중치 미지정 시 기본
# [참고] _WEIGHT_KEY가 모든 소점수 키를 이미 _DEFAULT_W로 매핑해 이 fallback은 현재 코드 경로상 도달 불가능 — 동작엔 영향 없어 값 유지

# ── 필수조건(requirements) 하드 판정 ──────────────────────────
DIST_TOLERANCE_PCT  = 10.0    # 목표 거리 ±이 값(%)
REQ_MIN_COUNT       = 1       # 필수 시설(화장실/편의점) 최소 개수
REQ_PARK_RATIO_MIN  = 0.05    # 필수 "녹지 인접" 최소 인접률
# [유지] 필수조건 하드컷은 참고자료·실측 대상 아님. REQ_PARK_RATIO_MIN(0.05) < PARK_RATIO_FULL(0.15) 위계는 이미 합리적



def _clamp(v, lo=0.0, hi=100.0):
    return max(lo, min(hi, v))


def _score_lower_is_better(value, good, bad):
    """value=good -> 100, value=bad -> 0 (작을수록 좋음). 선형 + 클램프."""
    if bad == good:
        return 100.0
    return _clamp(100.0 * (bad - value) / (bad - good))


def _score_higher_is_better(value, zero, full):
    """value<=zero -> 0, value>=full -> 100 (클수록 좋음)."""
    if full == zero:
        return 100.0
    return _clamp(100.0 * (value - zero) / (full - zero))


def _facility_count_score(count, full, nearest_m):
    if not count:
        return 0.0
    base = _clamp(100.0 * count / full)
    if nearest_m is not None and nearest_m > NEAR_OK_M:
        base -= _clamp((nearest_m - NEAR_OK_M) / NEAR_PENALTY_SPAN_M * NEAR_PENALTY_PER_SPAN,
                       0.0, NEAR_PENALTY_MAX)
    return _clamp(base)


def compute_sub_scores(cand: CandidateRoute) -> SubScores:
    f = cand.get("facilities") or {}
    slope = cand.get("slope") or {}
    nat = cand.get("nature") or {}
    surf = cand.get("surface") or {}
    km = cand["actual_distance_m"] / 1000 or 1e-9

    subs = {}

    # 거리
    subs["distance"] = round(_score_lower_is_better(cand["distance_error_pct"], 0.0, DIST_ERR_ZERO_PCT), 1)

    # 경사 (DEM 없으면 중립 50)
    gain = slope.get("elevation_gain_m")
    subs["elevation"] = ELEVATION_NEUTRAL if gain is None else round(_score_lower_is_better(gain / km, 0.0, GAIN_PER_KM_ZERO), 1)

    # 화장실 / 편의점 (개수 + 근접)
    subs["toilet"] = round(_facility_count_score(
        f.get("toilet_count", 0),  # 시설 정보에 화장실 개수 가져오기. 없으면 0
        TOILET_FULL, # 화장실 개수에 임계점 넣어주기
        f.get("toilet_nearest_m")), # 가장 가까운 것도 가져와주기
        1
    )
    subs["store"] = round(_facility_count_score(f.get("store_count", 0), STORE_FULL, f.get("store_nearest_m")), 1)

    # 녹지 / 하천 인접률 (OSM 폴리곤 없으면 None)
    pr = nat.get("park_ratio")
    subs["park"] = None if pr is None else round(_score_higher_is_better(pr, 0.0, PARK_RATIO_FULL), 1)
    wr = nat.get("water_ratio")
    subs["water"] = None if wr is None else round(_score_higher_is_better(wr, 0.0, WATER_RATIO_FULL), 1)

    # 야간: 가로등+보안등+보행등 합산 / CCTV 별도
    light = (f.get("light_count", 0) + f.get("security_count", 0) + f.get("walklight_count", 0))
    subs["streetlight"] = round(_score_higher_is_better(light / km, 0.0, STREETLIGHT_PER_KM_FULL), 1)
    subs["cctv"] = round(_score_higher_is_better(f.get("cctv_count", 0) / km, 0.0, CCTV_PER_KM_FULL), 1)

    # 노면 (OSM 속성 없으면 None): 보행자친화 비율이 기본점, 큰길·계단은 감점
    wratio = surf.get("walkable_ratio")
    if wratio is None:
        subs["surface"] = None  
    else:
        base = _score_higher_is_better(wratio, 0.0, WALKABLE_FULL)
        bigroad_penalty = _clamp(surf.get("bigroad_ratio", 0.0) / BIGROAD_ZERO * BIGROAD_PENALTY_MAX,
                                 0.0, BIGROAD_PENALTY_MAX)
        stairs_penalty = STAIRS_PENALTY * surf.get("stairs_count", 0)
        subs["surface"] = round(_clamp(base - bigroad_penalty - stairs_penalty), 1)

    # 탐색 비용과 같이 신호등·횡단보도를 모두 평가한다.
    spk = surf.get("signal_per_km")
    cpk = surf.get("crossing_per_km")
    subs["flow"] = None if spk is None and cpk is None else round(
        _score_lower_is_better((spk or 0) + 0.5 * (cpk or 0), 0.0, SIGNAL_PER_KM_ZERO), 1)

    # 겹침: 왕복(out_and_back)은 의미 없어 제외
    if cand.get("mode") == "out_and_back":
        subs["overlap"] = None
    else:
        subs["overlap"] = round(_score_lower_is_better(cand.get("overlap_ratio", 0.0), 0.0, OVERLAP_ZERO), 1)

    return subs


# 소점수 이름 -> 사용자 weights dict 에서 읽을 키
_WEIGHT_KEY = {
    "distance": "distance", "elevation": "elevation",
    "toilet": "toilet", "store": "store",
    "park": "park", "water": "park",            # 하천도 자연 선호(park) 가중치 공유
    "streetlight": "night", "cctv": "night",    # 야간 가중치 공유
    "surface": "surface", "flow": "flow", "overlap": "overlap",
}
_DEFAULT_W = {"distance": 3, "elevation": 3, "toilet": 3, "store": 3,
              "park": 3, "night": 3, "surface": 2, "flow": 2, "overlap": 2}


def compute_condition_score(
    subs: SubScores,
    weights: Weights | None = None,
    facility_preferences: dict[str, str] | None = None,
) -> float:
    w = {**_DEFAULT_W, **(weights or {})}
    if weights and "nature" in weights:
        w["park"] = weights["nature"]
    preferences = facility_preferences or {}

    num = den = 0.0

    for name, score in subs.items():
        if score is None:
            continue

        # 체크하지 않은 시설은 점수 계산에서 완전히 제외
        if name == "toilet" and preferences.get("toilet", "IGNORE") != "PREFER":
            continue

        if name == "store" and preferences.get("store", "IGNORE") != "PREFER":
            continue

        wt = w.get(_WEIGHT_KEY.get(name, name), DEFAULT_WEIGHT)
        num += score * wt
        den += wt

    return round(num / den, 1) if den else 0.0


def check_requirements(
    cand: CandidateRoute,
    requirements: Requirements | None = None,
) -> tuple[list[str], bool]:
    """반환: (failed_conditions[], exact_match)."""
    req = requirements or {}
    f = cand.get("facilities") or {}
    surf = cand.get("surface") or {}
    nat = cand.get("nature") or {}
    failed = []

    if cand["distance_error_pct"] > DIST_TOLERANCE_PCT:
        failed.append(f"목표 거리 ±{DIST_TOLERANCE_PCT:.0f}%")
    if req.get("toilet") and f.get("toilet_count", 0) < REQ_MIN_COUNT:
        failed.append("화장실 최소 1곳")
    if req.get("store") and f.get("store_count", 0) < REQ_MIN_COUNT:
        failed.append("편의점 최소 1곳")
    if req.get("no_stairs") and surf.get("stairs_count", 0) > 0:
        failed.append("계단 없음")
    if req.get("park") and (nat.get("park_ratio") or 0) < REQ_PARK_RATIO_MIN:
        failed.append("녹지 인접")

    return failed, len(failed) == 0


def score_candidate(
    cand: CandidateRoute,
    weights: Weights | None = None,
    requirements: Requirements | None = None,
    facility_preferences: dict[str, str] | None = None,
) -> CandidateRoute:
    # pipeline에서  scoring의 모듈들을 이용해서 누적한 점수들을 한곳에서 처리하는 코드
    subs = compute_sub_scores(cand)
    # '약간 경사짐'은 평지 만점이 아닌 탐색과 동일한 완만한 경사 목표를 쓴다.
    if (requirements or {}).get("slope_preference") == "NORMAL":
        average = (cand.get("slope") or {}).get("avg_slope_pct")
        if average is not None:
            target = config.ROLLING_TARGET_SLOPE_PCT
            subs["elevation"] = round(_clamp(100 * (1 - abs(average - target) / target)), 1)

    failed, exact = check_requirements(cand, requirements)

    cand["sub_scores"] = subs
    cand["condition_score"] = compute_condition_score(
        subs,
        weights,
        facility_preferences,
    )
    cand["failed_conditions"] = failed
    cand["exact_match"] = exact
    cand["estimated_minutes"] = round(
        cand["actual_distance_m"] / 1000 * PACE_MIN_PER_KM,
    )

    return cand
