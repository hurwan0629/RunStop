import argparse
import json
import math
import random
from pathlib import Path


# 난수 생성 결과를 항상 동일하게 재현하기 위한 seed 값.
# 같은 입력 파일과 같은 SEED를 사용하면 persona/scenario/noise 선택 결과도 동일하게 나온다.
SEED = 20260914
# 현재 이 파이썬 파일이 위치한 디렉터리.
# 실행 위치(CWD)가 달라도 파일 기준 상대경로를 안정적으로 사용할 수 있게 한다.
HERE = Path(__file__).resolve().parent
# 기존에 만들어져 있던 1000명 / 5000요청 합성 데이터.
# 이 파일의 사용자/요청 골격(start, end, target_km, route_type 등)을 재사용한다.
DEFAULT_SOURCE = HERE / "previous_version" / "runstop_users_1000_5000_requests.json"
# behavioral persona와 요청별 선호 변화를 입힌 새 데이터의 기본 저장 위치.
DEFAULT_OUTPUT = HERE / "runstop_users_1000_5000_requests_behavioral.json"

# profile.weights와 request.weights가 공통으로 가져야 하는 전체 선호 축.
# 각 값은 아래 코드에서 1~5 범위의 중요도로 사용한다.
WEIGHT_KEYS = (
    "distance",
    "elevation",
    "toilet",
    "store",
    "night",
    "park",
    "flow",
    "surface",
    "overlap",
    "safety",
    "nature",
)

# weight보다 더 강한 '필수 조건'으로 표현할 수 있는 항목들.
# 예: toilet weight=5는 '매우 중요', requirements["toilet"]=True는 '필수'에 가깝다.
BOOL_REQUIREMENTS = ("toilet", "store", "park", "no_stairs")
# 요청에 경유지(vias)를 추가할 기본 확률.
# rng.random()이 이 값보다 작을 때만 경유지를 생성하므로 약 12%의 요청에 적용된다.
VIA_RATE = 0.12

# 생성하거나 검증하는 좌표가 서울 주변 범위 안에 있는지 확인하기 위한 bounding box.
# 정확한 행정구역 polygon 판정이 아니라 위도/경도의 사각형 범위 검사다.
SEOUL_BOUNDS = {
    "lat_min": 37.413,
    "lat_max": 37.715,
    "lng_min": 126.734,
    "lng_max": 127.269,
}

# ---------------------------------------------------------------------------
# Synthetic behavioral personas
#
# 이 파일의 핵심 가정:
#   profile.weights = 장기적/잠재적인 실제 선택 성향(latent/revealed-choice proxy)
#   request.weights = 이번 요청에서 사용자가 표명한 선호(stated preference)
#
# 현재 ai/src/generation/utility.py가 profile.weights와 request.weights를
# profile_share 비율로 섞기 때문에, 별도 파이프라인 수정 없이 이 구분을 사용할 수 있다.
#
# 아래 수치는 실제 사용자 로그에서 학습된 값이 아니라 "검증할 합성 가설"이다.
# 따라서 이후 sensitivity test / human pairwise validation으로 검증해야 한다.
# ---------------------------------------------------------------------------

# 사용자 장기 성향을 표현하는 persona 정의.
# 각 persona에는:
#   weights          -> 평소 어떤 경로 특성을 중요하게 보는지
#   scenario_weights -> 어떤 요청 상황을 상대적으로 자주 만드는지
# 가 들어 있다.
PERSONAS = {
    # efficient: 효율형. 목표 거리와 흐름을 중시하고, 우회/겹침을 싫어하는 유형
    "efficient": {
        "weights": {
            "distance": 5,
            "elevation": 3,
            "toilet": 2,
            "store": 2,
            "night": 2,
            "park": 2,
            "flow": 4,
            "surface": 3,
            "overlap": 4,
            "safety": 3,
            "nature": 2,
        },
        "scenario_weights": {
            "normal": 4,
            "easy": 1,
            "quick": 4,
            "night": 1,
            "nature": 1,
            "facility": 1,
            "explore": 1,
        },
    },

    # comfort: 편안함형. 평탄함, 보행친화도, 안전성을 중시하는 유형
    "comfort": {
        "weights": {
            "distance": 3,
            "elevation": 5,
            "toilet": 3,
            "store": 3,
            "night": 3,
            "park": 3,
            "flow": 3,
            "surface": 5,
            "overlap": 2,
            "safety": 4,
            "nature": 3,
        },
        "scenario_weights": {
            "normal": 4,
            "easy": 4,
            "quick": 1,
            "night": 2,
            "nature": 2,
            "facility": 2,
            "explore": 1,
        },
    },

    # safety: 안전형. 야간/조명/안전과 보행환경을 강하게 중시하는 유형
    "safety": {
        "weights": {
            "distance": 3,
            "elevation": 3,
            "toilet": 2,
            "store": 3,
            "night": 5,
            "park": 2,
            "flow": 3,
            "surface": 4,
            "overlap": 2,
            "safety": 5,
            "nature": 2,
        },
        "scenario_weights": {
            "normal": 4,
            "easy": 2,
            "quick": 1,
            "night": 4,
            "nature": 1,
            "facility": 2,
            "explore": 1,
        },
    },

    # nature: 자연형. 공원/하천/자연환경을 위해 약간의 거리·효율 손해를 감수하는 유형
    "nature": {
        "weights": {
            "distance": 3,
            "elevation": 3,
            "toilet": 2,
            "store": 2,
            "night": 2,
            "park": 5,
            "flow": 2,
            "surface": 3,
            "overlap": 3,
            "safety": 3,
            "nature": 5,
        },
        "scenario_weights": {
            "normal": 3,
            "easy": 2,
            "quick": 1,
            "night": 1,
            "nature": 5,
            "facility": 1,
            "explore": 3,
        },
    },

    # facility: 편의시설형. 화장실/편의점 등 경로 주변 편의시설을 중요하게 보는 유형
    "facility": {
        "weights": {
            "distance": 3,
            "elevation": 3,
            "toilet": 5,
            "store": 5,
            "night": 3,
            "park": 2,
            "flow": 3,
            "surface": 3,
            "overlap": 2,
            "safety": 3,
            "nature": 2,
        },
        "scenario_weights": {
            "normal": 3,
            "easy": 2,
            "quick": 1,
            "night": 2,
            "nature": 1,
            "facility": 5,
            "explore": 1,
        },
    },

    # balanced: 균형형. 특정 축에 강하게 치우치지 않는 기준 유형
    "balanced": {
        "weights": {
            "distance": 3,
            "elevation": 3,
            "toilet": 3,
            "store": 3,
            "night": 3,
            "park": 3,
            "flow": 3,
            "surface": 3,
            "overlap": 3,
            "safety": 3,
            "nature": 3,
        },
        "scenario_weights": {
            "normal": 5,
            "easy": 2,
            "quick": 2,
            "night": 2,
            "nature": 2,
            "facility": 2,
            "explore": 2,
        },
    },
}

# 합성 데이터에서 persona 자체가 과하게 균등해 보이지 않도록 기본 분포를 둔다.
# 이 비율 역시 실제 로그 기반이 아니라 sensitivity test 대상인 synthetic assumption이다.
# 전체 합성 사용자 중 각 persona가 선택될 상대적 비율.
# 절대 확률이 아니라 가중치이므로 전체 합으로 나눈 값이 실제 선택 확률이 된다.
PERSONA_WEIGHTS = {
    "efficient": 2,
    "comfort": 3,
    "safety": 2,
    "nature": 3,
    "facility": 2,
    "balanced": 3,
}

# 한 번의 요청에서 일시적으로 선호가 달라지는 상황 정의.
# 선택된 scenario의 항목만 profile 기반 request weight에 +1/-1 식으로 조정된다.
# normal은 별도 변화가 없다.
SCENARIOS = {
    "normal": {},
    "easy": {"elevation": 1, "surface": 1},
    "quick": {"distance": 1, "flow": 1},
    "night": {"safety": 1, "night": 1},
    "nature": {"nature": 1, "park": 1},
    "facility": {"toilet": 1, "store": 1},
    "explore": {"nature": 1, "overlap": 1, "distance": -1},
}


# weight가 어떤 계산을 거치더라도 최종적으로 1~5 범위를 벗어나지 않게 제한한다.
def clamp_weight(value):
    return max(1, min(5, int(round(value))))


# {"A": 2, "B": 3} 같은 가중치 딕셔너리에서 하나를 확률적으로 선택한다.
# random.choices의 weights 인자를 사용하므로 B가 A보다 더 자주 선택된다.
def weighted_choice(rng, weights):
    # 딕셔너리의 key들을 실제 선택 후보 목록으로 만든다.
    keys = list(weights)

    # 각 key의 가중치를 random.choices에 전달해 후보 하나를 뽑는다.
    # k=1이므로 리스트 하나가 반환되고, [0]으로 실제 선택값만 꺼낸다.
    return rng.choices(keys, weights=[weights[key] for key in keys], k=1)[0]


# [lat, lng] 좌표가 위에서 정의한 SEOUL_BOUNDS 안에 있는지 검사한다.
def in_seoul(point):
    # point[0]은 위도(lat), point[1]은 경도(lng)로 사용한다.
    # 두 값이 모두 서울 bounding box 안에 들어오면 True를 반환한다.
    return (
        SEOUL_BOUNDS["lat_min"] <= point[0] <= SEOUL_BOUNDS["lat_max"]
        and SEOUL_BOUNDS["lng_min"] <= point[1] <= SEOUL_BOUNDS["lng_max"]
    )


# 시작점에서 특정 거리(m)와 방위각(degree)만큼 이동한 위경도 좌표를 계산한다.
# 지구를 반지름 6,371km의 구로 보고 구면 좌표 공식을 사용한다.
def destination_point(start, distance_m, bearing_deg):
    # 지구 반지름을 meter 단위로 두고 계산한다.
    radius = 6371000.0

    # 삼각함수 계산을 위해 시작 좌표와 방위각을 degree -> radian으로 변환한다.
    lat1 = math.radians(start[0])
    lon1 = math.radians(start[1])
    bearing = math.radians(bearing_deg)

    # 실제 이동거리(m)를 지구 중심각으로 변환한다.
    angular_distance = distance_m / radius

    # 구면 위에서 이동한 뒤의 위도를 계산한다.
    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular_distance)
        + math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing)
    )
    # 같은 방식으로 이동 후의 경도를 계산한다.
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(lat1),
        math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2),
    )

    # 계산 중 사용한 radian을 다시 degree로 바꾸고 소수점 7자리로 정리한다.
    return [round(math.degrees(lat2), 7), round(math.degrees(lon2), 7)]


# start 주변의 임의 좌표를 생성하되 서울 범위 안에 들어오는 점만 반환한다.
# 최대 50번 시도하며 모두 실패하면 None을 반환한다.
def nearby_point(rng, start, min_distance_m, max_distance_m):
    # 서울 범위 밖으로 나가는 좌표가 나올 수 있으므로 최대 50번 다시 시도한다.
    for _ in range(50):
        # 거리와 방향을 각각 랜덤하게 뽑아 start 주변 후보 좌표를 만든다.
        point = destination_point(
            start,
            rng.uniform(min_distance_m, max_distance_m),
            rng.uniform(0, 360),
        )

        # 서울 범위 안의 첫 번째 유효 좌표가 나오면 즉시 반환한다.
        if in_seoul(point):
            return point

    # 50번 동안 서울 안의 좌표를 만들지 못했으면 경유지 생성을 포기한다.
    return None


# PERSONA_WEIGHTS의 분포에 따라 사용자에게 persona 하나를 부여한다.
def sample_persona(rng):
    return weighted_choice(rng, PERSONA_WEIGHTS)


# persona의 기준 weights를 바탕으로 사용자 개인의 장기 선호(profile.weights)를 만든다.
# persona라는 큰 방향은 유지하되 일부 축에 작은 noise를 줘 사용자별 차이를 만든다.
def persona_profile_weights(rng, persona):
    """
    persona 중심값에서 사용자별 작은 차이를 만들어 장기 선택 성향을 만든다.

    모든 efficient 사용자가 완전히 같은 벡터를 갖지 않도록 일부 축에만
    -1/0/+1 noise를 넣는다. 큰 방향은 persona가 유지한다.
    """
    # 선택된 persona가 가진 기본 선호 벡터를 가져온다.
    base = PERSONAS[persona]["weights"]

    # 사용자 개인의 최종 장기 선호를 담을 새 딕셔너리.
    weights = {}

    # 모든 선호 축을 하나씩 순회하면서 persona 기준값에 작은 개인차를 넣는다.
    for key in WEIGHT_KEYS:
        # -1 / 0 / +1 중 하나를 뽑되 0의 가중치가 8이라 대부분은 기준값을 유지한다.
        noise = rng.choices([-1, 0, 1], weights=[1, 8, 1], k=1)[0]

        # persona 기준값 + noise를 계산한 뒤 1~5 범위로 제한한다.
        weights[key] = clamp_weight(base[key] + noise)

    # 이 값이 해당 사용자의 profile.weights가 된다.
    return weights


# 장기 선호(profile_weights)에서 한 번의 요청용 선호(request.weights)를 만든다.
# 개인의 기본 성향 + 요청별 작은 noise + scenario 효과가 결합된다.
def request_weights(rng, profile_weights, scenario):
    """
    사용자가 이번 요청에서 '표명한' 선호를 만든다.

    장기 profile과 비슷하지만 완전히 같지 않으며,
    request context(scenario)에 따라 일부 축의 중요도가 일시적으로 변한다.
    """
    # 이번 요청에서 사용할 weight들을 새로 담는다.
    # profile_weights 자체를 수정하지 않기 위해 별도 딕셔너리를 만든다.
    weights = {}

    # 사용자의 장기 선호를 기준으로 각 항목에 요청 단위의 작은 변동을 준다.
    for key, value in profile_weights.items():
        # -1 / 0 / +1 중 하나를 선택한다.
        # 0의 가중치가 가장 크므로 대부분 profile 성향을 유지하고 일부만 달라진다.
        noise = rng.choices([-1, 0, 1], weights=[1, 6, 1], k=1)[0]

        # 장기 선호 + 요청별 noise를 계산하고 1~5 범위 안으로 보정한다.
        weights[key] = clamp_weight(value + noise)

    # 이번 요청의 scenario가 특정 선호 축을 더 중요하거나 덜 중요하게 만든다.
    # 예: quick이면 distance/flow +1, explore이면 distance -1 등이 적용된다.
    for key, delta in SCENARIOS[scenario].items():
        weights[key] = clamp_weight(weights[key] + delta)

    # 최종 request.weights를 반환한다.
    return weights


# 요청 weight와 scenario를 이용해 toilet/store/park/no_stairs 같은 필수 조건을 확률적으로 만든다.
# 해당 요소의 weight가 높을수록 requirement=True가 될 가능성이 커진다.
def request_requirements(rng, weights, scenario):
    """
    preference(weight)보다 강한 '필수 조건'을 확률적으로 만든다.

    특정 요소의 weight가 높을수록 해당 requirement가 True가 될 가능성이 높고,
    scenario가 그 가능성을 추가로 조정한다.
    """
    # 각 requirement가 True가 될 기본 확률을 계산한다.
    # 관련 weight가 2보다 높을수록 해당 조건이 필수가 될 확률도 올라간다.
    chances = {
        "toilet": 0.04 + 0.08 * max(0, weights["toilet"] - 2),
        "store": 0.03 + 0.07 * max(0, weights["store"] - 2),
        "park": 0.03 + 0.08 * max(0, max(weights["park"], weights["nature"]) - 2),
        "no_stairs": 0.04 + 0.08 * max(0, max(weights["surface"], weights["elevation"]) - 2),
    }

    # scenario 특성에 맞는 requirement는 한 번 더 확률을 높인다.
    if scenario == "easy":
        chances["no_stairs"] += 0.16
    elif scenario == "facility":
        chances["toilet"] += 0.18
        chances["store"] += 0.18
    elif scenario == "nature":
        chances["park"] += 0.20
    elif scenario == "night":
        chances["store"] += 0.08

    # 각 requirement마다 랜덤 값을 뽑아 실제로 필수 조건으로 포함할지 결정한다.
    # 확률은 지나치게 커지지 않도록 최대 70%까지만 허용한다.
    return {
        key: True
        for key, chance in chances.items()
        if rng.random() < min(chance, 0.70)
    }


# requirements 딕셔너리의 key만 정렬된 tuple로 바꿔 비교하기 쉽게 만든다.
# 값은 생성되는 경우 항상 True이므로 어떤 requirement들이 존재하는지가 핵심이다.
def signature(requirements):
    # 딕셔너리를 그대로 비교하지 않고 key 목록을 정렬된 tuple로 바꿔
    # "어떤 requirement 조합인가"만 비교할 수 있게 한다.
    return tuple(sorted(requirements))


# 한 사용자의 모든 요청이 우연히 완전히 같은 requirements를 갖게 된 경우
# 마지막 요청 하나를 조정해서 최소한의 variation을 강제로 만든다.
# 뒤의 validate()에서 '모든 request requirements가 동일함'을 막기 위한 보정이다.
def force_requirement_variation(requests):
    # 사용자 요청별 requirement 조합을 비교 가능한 signature로 바꾼다.
    signatures = [signature(request["requirements"]) for request in requests]

    # 이미 서로 다른 requirement 조합이 존재하면 손댈 필요가 없다.
    if len(set(signatures)) > 1:
        return

    # 모든 요청이 같다면 마지막 요청 하나만 수정 대상으로 잡는다.
    last = requests[-1]["requirements"]
    weights = requests[-1]["weights"]

    # 마지막 요청의 weight를 보고 어떤 requirement를 우선 추가할지 정한다.
    preferred = []

    if max(weights["surface"], weights["elevation"]) >= 4:
        preferred.append("no_stairs")
    if weights["toilet"] >= 4:
        preferred.append("toilet")
    if weights["store"] >= 4:
        preferred.append("store")
    if max(weights["park"], weights["nature"]) >= 4:
        preferred.append("park")

    # 선호와 관련된 requirement를 우선 확인하고,
    # 없으면 나머지 BOOL_REQUIREMENTS까지 순서대로 확인한다.
    for key in dict.fromkeys(preferred + list(BOOL_REQUIREMENTS)):
        # 현재 마지막 요청에 없는 requirement 하나를 추가하면 variation이 생긴다.
        if key not in last:
            last[key] = True
            return

    # 이미 모든 requirement가 들어 있어 추가할 수 없다면 하나를 제거해 차이를 만든다.
    if last:
        del last[sorted(last)[0]]


# 기존 요청(raw)을 기준으로 경유지(vias)를 확률적으로 추가한다.
# ONE_WAY는 start/end 관계를 활용하고, 그 외 route type은 start 주변에서 점을 만든다.
def request_vias(rng, raw):
    # VIA_RATE(12%)에 걸리지 않은 대부분의 요청은 경유지를 만들지 않는다.
    if rng.random() >= VIA_RATE:
        return []

    # 기존 요청의 출발점과 목표 거리를 경유지 생성 기준으로 사용한다.
    start = raw["start"]
    target_m = raw["target_km"] * 1000

    # 생성한 경유지 후보를 순서대로 담는다.
    points = []

    # 편도 경로는 start와 end가 있으므로 두 지점 관계를 이용해 경유지를 배치한다.
    if raw["route_type"] == "ONE_WAY" and raw.get("end") is not None:
        end = raw["end"]

        # 시작점과 도착점의 단순 중간 좌표를 하나의 anchor로 사용한다.
        midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]

        # start 주변과 midpoint 주변에서 각각 경유지 하나씩 만든다.
        for anchor in (start, midpoint):
            points.append(nearby_point(rng, anchor, 80, max(250, target_m * 0.12)))
    else:
        # 편도가 아닌 경로는 start 주변에서 서로 다른 경유지 두 개를 만든다.
        for _ in range(2):
            points.append(nearby_point(rng, start, 250, max(500, target_m * 0.28)))

    # 두 경유지가 모두 정상 생성됐을 때만 사용하고, 하나라도 실패하면 vias 자체를 비운다.
    return points if all(points) else []


# 기존 요청의 핵심 골격은 유지하고 새로 만든 behavioral 필드를 합쳐
# 최종 request 딕셔너리 형태로 정리한다.
def normalize_request(raw, weights, requirements, vias):
    # 기존 요청에서 경로 형태/출발점/목표 거리는 그대로 가져오고,
    # 새로 생성한 weights와 requirements를 합친다.
    request = {
        "route_type": raw["route_type"],
        "start": raw["start"],
        "target_km": raw["target_km"],
        "weights": weights,
        "requirements": requirements,
    }

    # 기존 요청이 도착점을 가지고 있을 때만 end를 유지한다.
    if raw.get("end") is not None:
        request["end"] = raw["end"]

    # 경유지가 실제로 생성된 요청에만 vias 필드를 추가한다.
    if vias:
        request["vias"] = vias

    # behavioral 정보가 합쳐진 최종 요청을 반환한다.
    return request


# 기존 데이터 전체를 순회하며 behavioral 버전 데이터셋을 새로 구성한다.
# 핵심 흐름:
#   사용자 -> persona -> profile.weights
#   각 기존 request -> scenario -> request.weights -> requirements -> vias
# 기존 start/end/target_km/route_type 같은 요청 골격은 그대로 사용한다.
def regenerate(data):
    rng = random.Random(SEED)
    users = []

    # 기존 데이터의 모든 사용자를 한 명씩 처리한다.
    for user in data["users"]:
        # 이전 데이터의 weight를 그대로 재사용하지 않고,
        # 이번 behavioral generator가 persona 기반 장기 profile을 새로 만든다.
        persona = sample_persona(rng)
        profile_weights = persona_profile_weights(rng, persona)

        # 기존 profile의 기타 정보는 유지한다.
        # 기존 profile은 얕은 복사해 나머지 정보는 유지한다.
        profile = dict(user["profile"])

        # behavioral generator가 만든 persona와 장기 weight만 덮어쓴다.
        profile["persona"] = persona
        profile["weights"] = profile_weights

        # 새로 구성한 request들을 저장할 리스트.
        requests = []

        # 분석/debug용으로 어떤 scenario가 선택됐는지도 별도로 기록한다.
        scenario_history = []

        # 사용자의 기존 요청 개수와 기본 골격은 그대로 유지하면서 하나씩 behavioral 정보만 다시 만든다.
        for raw_request in user["requests"]:
            # persona마다 어떤 상황의 요청이 더 자주 나타나는지 다르게 설정한다.
            # 예: efficient는 quick, comfort는 easy가 상대적으로 더 자주 선택된다.
            scenario = weighted_choice(rng, PERSONAS[persona]["scenario_weights"])

            # 나중에 어떤 scenario들이 선택됐는지 확인할 수 있도록 별도로 기록한다.
            scenario_history.append(scenario)

            # 장기 profile.weights를 기준으로 noise와 scenario 효과를 반영해
            # 이번 요청에서 실제로 사용할 request.weights를 만든다.
            weights = request_weights(rng, profile_weights, scenario)

            # request.weights와 scenario를 기반으로 화장실/공원/no_stairs 같은
            # 더 강한 필수 조건(requirements)을 확률적으로 만든다.
            requirements = request_requirements(rng, weights, scenario)

            # 기존 요청의 start/end/target_km를 활용해 약 12% 확률로 경유지를 생성한다.
            vias = request_vias(rng, raw_request)

            # 기존 raw_request와 방금 만든 behavioral 필드들을 하나의 요청 형태로 합친다.
            requests.append(
                normalize_request(
                    raw_request,
                    weights,
                    requirements,
                    vias,
                )
            )

        # 한 사용자의 모든 요청이 우연히 같은 requirements를 가지는 경우,
        # 마지막 요청을 조금 조정해 최소한의 요청별 차이가 생기도록 한다.
        force_requirement_variation(requests)

        # 한 사용자의 profile + 변형된 요청 목록을 새 사용자 데이터에 추가한다.
        users.append({
            "sample_id": user.get("sample_id", user.get("sampleId")),
            "profile": profile,
            "requests": requests,

            # generation/debug용 설명 필드.
            # ai loader는 사용자 최상위의 추가 필드를 사용하지 않으므로
            # downstream ranking feature에는 직접 들어가지 않는다.
            "synthetic_behavior": {
                "persona": persona,
                "scenarios": scenario_history,
            },
        })

    # 모든 사용자를 처리한 뒤 데이터셋 설명/개수와 함께 최종 구조로 묶어 반환한다.
    return {
        "dataset_name": "RunStop synthetic users with behavioral personas and stated preferences",
        "version": "behavioral_v1",
        "seed": SEED,
        "behavior_model": {
            "profile_weights": "latent long-term choice preference proxy",
            "request_weights": "stated request-level preference",
            "note": "Synthetic assumptions; validate with sensitivity tests and human pairwise judgments.",
        },
        "user_count": len(users),
        "requests_per_user": len(users[0]["requests"]) if users else 0,
        "total_request_count": sum(len(user["requests"]) for user in users),
        "users": users,
    }


# regenerate()가 만든 데이터가 의도한 형식과 최소 조건을 만족하는지 검증한다.
# 데이터를 수정하는 함수가 아니라 이상이 있으면 ValueError를 발생시키는 sanity check다.
def validate(data):
    # 이번 생성기의 전제인 사용자 1000명인지 먼저 확인한다.
    if data["user_count"] != 1000:
        raise ValueError(f"user_count must be 1000, got {data['user_count']}")
    # 전체 요청 수도 기존 설계값인 5000개인지 확인한다.
    if data["total_request_count"] != 5000:
        raise ValueError(f"total_request_count must be 5000, got {data['total_request_count']}")

    # 각 persona가 실제로 몇 명 생성됐는지 세기 위한 카운터.
    persona_counts = {key: 0 for key in PERSONAS}

    # 사용자 단위로 profile과 request 구조를 검증한다.
    for user in data["users"]:
        # profile에 유효한 persona가 들어 있는지 확인한다.
        persona = user["profile"].get("persona")
        if persona not in PERSONAS:
            raise ValueError(f"{user['sample_id']}: invalid persona {persona}")
        persona_counts[persona] += 1

        # profile.weights가 정확히 정의된 11개 weight key를 가지는지 확인한다.
        profile_weights = user["profile"]["weights"]
        if set(profile_weights) != set(WEIGHT_KEYS):
            raise ValueError(f"{user['sample_id']}: bad profile weights")

        if any(not (1 <= value <= 5) for value in profile_weights.values()):
            raise ValueError(f"{user['sample_id']}: profile weight outside 1..5")

        # 한 사용자의 request들이 서로 실제로 달라지는지 확인하기 위한 비교용 값들.
        request_weight_signatures = []
        requirement_signatures = []

        # request.weights가 profile.weights와 한 번이라도 달라졌는지 기록한다.
        differs_from_profile = False

        # 사용자의 각 요청을 하나씩 검사한다.
        for request in user["requests"]:
            # start/end/via 좌표가 모두 서울 bounding box 안인지 확인한다.
            if not in_seoul(request["start"]):
                raise ValueError(f"{user['sample_id']}: start outside Seoul bounds")
            if request.get("end") is not None and not in_seoul(request["end"]):
                raise ValueError(f"{user['sample_id']}: end outside Seoul bounds")
            for via in request.get("vias", []):
                if not in_seoul(via):
                    raise ValueError(f"{user['sample_id']}: via outside Seoul bounds")

            # request.weights도 profile과 동일한 weight schema를 가져야 한다.
            if set(request["weights"]) != set(WEIGHT_KEYS):
                raise ValueError(f"{user['sample_id']}: request is missing weights")
            if any(not (1 <= value <= 5) for value in request["weights"].values()):
                raise ValueError(f"{user['sample_id']}: request weight outside 1..5")

            if set(request.get("requirements", {})) - set(BOOL_REQUIREMENTS):
                raise ValueError(f"{user['sample_id']}: unsupported requirements")

            # 각 request의 weight 벡터를 tuple로 저장해 나중에 서로 같은지 비교한다.
            request_weight_signatures.append(
                tuple(request["weights"][key] for key in WEIGHT_KEYS)
            )

            # requirements도 조합만 비교할 수 있도록 signature로 저장한다.
            requirement_signatures.append(
                signature(request.get("requirements", {}))
            )

            if request["weights"] != profile_weights:
                differs_from_profile = True

        # 모든 요청의 weights가 완전히 같다면 요청별 variation 생성이 실패한 것으로 본다.
        if len(set(request_weight_signatures)) == 1:
            raise ValueError(f"{user['sample_id']}: all request weights are identical")
        # 모든 요청의 requirements까지 완전히 같다면 역시 variation이 없다고 판단한다.
        if len(set(requirement_signatures)) == 1:
            raise ValueError(f"{user['sample_id']}: all request requirements are identical")
        # 최소 한 번은 사용자가 장기적으로 가진 profile 선호와
        # 실제 요청에서 표명한 request 선호가 달라져야 한다.
        if not differs_from_profile:
            raise ValueError(
                f"{user['sample_id']}: stated request weights never differ from latent profile"
            )

    # 모든 persona가 실제 생성됐는지 최소 sanity check
    missing_personas = [key for key, count in persona_counts.items() if count == 0]
    if missing_personas:
        raise ValueError(f"missing personas: {missing_personas}")


# CLI 진입점.
# 입력 JSON 읽기 -> behavioral 데이터 생성 -> 검증 -> 새 JSON 저장 순서로 실행한다.
def main():
    # 명령행에서 --source / --output을 덮어쓸 수 있게 한다.
    # 아무 인자도 주지 않으면 위의 DEFAULT_SOURCE / DEFAULT_OUTPUT을 사용한다.
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    data = json.loads(args.source.read_text(encoding="utf-8-sig"))
    generated = regenerate(data)
    validate(generated)

    # 검증까지 통과한 결과만 JSON으로 저장한다.
    # ensure_ascii=False로 한글을 그대로 유지하고 indent=2로 읽기 쉽게 출력한다.
    args.output.write_text(
        json.dumps(generated, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    # 최종 생성 파일 위치를 터미널에 출력한다.
    print(args.output)


# 이 파일을 직접 실행했을 때만 main()을 호출한다.
# 다른 파일에서 import할 때는 자동으로 데이터 생성을 실행하지 않는다.
if __name__ == "__main__":
    main()
