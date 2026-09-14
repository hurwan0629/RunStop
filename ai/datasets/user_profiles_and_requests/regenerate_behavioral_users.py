import argparse
import json
import math
import random
from pathlib import Path


SEED = 20260914
HERE = Path(__file__).resolve().parent
DEFAULT_SOURCE = HERE / "previous_version" / "runstop_users_1000_5000_requests.json"
DEFAULT_OUTPUT = HERE / "runstop_users_1000_5000_requests_behavioral.json"

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

BOOL_REQUIREMENTS = ("toilet", "store", "park", "no_stairs")
VIA_RATE = 0.12

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

PERSONAS = {
    # 목표 거리와 흐름을 중시하고, 우회/겹침을 싫어하는 유형
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

    # 평탄함, 보행친화도, 안전성을 중시하는 유형
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

    # 야간/조명/안전과 보행환경을 강하게 중시하는 유형
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

    # 공원/하천/자연환경을 위해 약간의 거리·효율 손해를 감수하는 유형
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

    # 화장실/편의점 등 경로 주변 편의시설을 중요하게 보는 유형
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

    # 특정 축에 강하게 치우치지 않는 기준 유형
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
PERSONA_WEIGHTS = {
    "efficient": 2,
    "comfort": 3,
    "safety": 2,
    "nature": 3,
    "facility": 2,
    "balanced": 3,
}

SCENARIOS = {
    "normal": {},
    "easy": {"elevation": 1, "surface": 1},
    "quick": {"distance": 1, "flow": 1},
    "night": {"safety": 1, "night": 1},
    "nature": {"nature": 1, "park": 1},
    "facility": {"toilet": 1, "store": 1},
    "explore": {"nature": 1, "overlap": 1, "distance": -1},
}


def clamp_weight(value):
    return max(1, min(5, int(round(value))))


def weighted_choice(rng, weights):
    keys = list(weights)
    return rng.choices(keys, weights=[weights[key] for key in keys], k=1)[0]


def in_seoul(point):
    return (
        SEOUL_BOUNDS["lat_min"] <= point[0] <= SEOUL_BOUNDS["lat_max"]
        and SEOUL_BOUNDS["lng_min"] <= point[1] <= SEOUL_BOUNDS["lng_max"]
    )


def destination_point(start, distance_m, bearing_deg):
    radius = 6371000.0
    lat1 = math.radians(start[0])
    lon1 = math.radians(start[1])
    bearing = math.radians(bearing_deg)
    angular_distance = distance_m / radius

    lat2 = math.asin(
        math.sin(lat1) * math.cos(angular_distance)
        + math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing)
    )
    lon2 = lon1 + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(lat1),
        math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2),
    )

    return [round(math.degrees(lat2), 7), round(math.degrees(lon2), 7)]


def nearby_point(rng, start, min_distance_m, max_distance_m):
    for _ in range(50):
        point = destination_point(
            start,
            rng.uniform(min_distance_m, max_distance_m),
            rng.uniform(0, 360),
        )
        if in_seoul(point):
            return point
    return None


def sample_persona(rng):
    return weighted_choice(rng, PERSONA_WEIGHTS)


def persona_profile_weights(rng, persona):
    """
    persona 중심값에서 사용자별 작은 차이를 만들어 장기 선택 성향을 만든다.

    모든 efficient 사용자가 완전히 같은 벡터를 갖지 않도록 일부 축에만
    -1/0/+1 noise를 넣는다. 큰 방향은 persona가 유지한다.
    """
    base = PERSONAS[persona]["weights"]
    weights = {}

    for key in WEIGHT_KEYS:
        noise = rng.choices([-1, 0, 1], weights=[1, 8, 1], k=1)[0]
        weights[key] = clamp_weight(base[key] + noise)

    return weights


def request_weights(rng, profile_weights, scenario):
    """
    사용자가 이번 요청에서 '표명한' 선호를 만든다.

    장기 profile과 비슷하지만 완전히 같지 않으며,
    request context(scenario)에 따라 일부 축의 중요도가 일시적으로 변한다.
    """
    weights = {}

    for key, value in profile_weights.items():
        noise = rng.choices([-1, 0, 1], weights=[1, 6, 1], k=1)[0]
        weights[key] = clamp_weight(value + noise)

    for key, delta in SCENARIOS[scenario].items():
        weights[key] = clamp_weight(weights[key] + delta)

    return weights


def request_requirements(rng, weights, scenario):
    """
    preference(weight)보다 강한 '필수 조건'을 확률적으로 만든다.

    특정 요소의 weight가 높을수록 해당 requirement가 True가 될 가능성이 높고,
    scenario가 그 가능성을 추가로 조정한다.
    """
    chances = {
        "toilet": 0.04 + 0.08 * max(0, weights["toilet"] - 2),
        "store": 0.03 + 0.07 * max(0, weights["store"] - 2),
        "park": 0.03 + 0.08 * max(0, max(weights["park"], weights["nature"]) - 2),
        "no_stairs": 0.04 + 0.08 * max(0, max(weights["surface"], weights["elevation"]) - 2),
    }

    if scenario == "easy":
        chances["no_stairs"] += 0.16
    elif scenario == "facility":
        chances["toilet"] += 0.18
        chances["store"] += 0.18
    elif scenario == "nature":
        chances["park"] += 0.20
    elif scenario == "night":
        chances["store"] += 0.08

    return {
        key: True
        for key, chance in chances.items()
        if rng.random() < min(chance, 0.70)
    }


def signature(requirements):
    return tuple(sorted(requirements))


def force_requirement_variation(requests):
    signatures = [signature(request["requirements"]) for request in requests]
    if len(set(signatures)) > 1:
        return

    last = requests[-1]["requirements"]
    weights = requests[-1]["weights"]
    preferred = []

    if max(weights["surface"], weights["elevation"]) >= 4:
        preferred.append("no_stairs")
    if weights["toilet"] >= 4:
        preferred.append("toilet")
    if weights["store"] >= 4:
        preferred.append("store")
    if max(weights["park"], weights["nature"]) >= 4:
        preferred.append("park")

    for key in dict.fromkeys(preferred + list(BOOL_REQUIREMENTS)):
        if key not in last:
            last[key] = True
            return

    if last:
        del last[sorted(last)[0]]


def request_vias(rng, raw):
    if rng.random() >= VIA_RATE:
        return []

    start = raw["start"]
    target_m = raw["target_km"] * 1000
    points = []

    if raw["route_type"] == "ONE_WAY" and raw.get("end") is not None:
        end = raw["end"]
        midpoint = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2]
        for anchor in (start, midpoint):
            points.append(nearby_point(rng, anchor, 80, max(250, target_m * 0.12)))
    else:
        for _ in range(2):
            points.append(nearby_point(rng, start, 250, max(500, target_m * 0.28)))

    return points if all(points) else []


def normalize_request(raw, weights, requirements, vias):
    request = {
        "route_type": raw["route_type"],
        "start": raw["start"],
        "target_km": raw["target_km"],
        "weights": weights,
        "requirements": requirements,
    }

    if raw.get("end") is not None:
        request["end"] = raw["end"]
    if vias:
        request["vias"] = vias

    return request


def regenerate(data):
    rng = random.Random(SEED)
    users = []

    for user in data["users"]:
        # 이전 데이터의 weight를 그대로 재사용하지 않고,
        # 이번 behavioral generator가 persona 기반 장기 profile을 새로 만든다.
        persona = sample_persona(rng)
        profile_weights = persona_profile_weights(rng, persona)

        # 기존 profile의 기타 정보는 유지한다.
        profile = dict(user["profile"])
        profile["persona"] = persona
        profile["weights"] = profile_weights

        requests = []
        scenario_history = []

        for raw_request in user["requests"]:
            # persona마다 어떤 상황의 요청이 더 자주 나타나는지 다르게 설정
            scenario = weighted_choice(rng, PERSONAS[persona]["scenario_weights"])
            scenario_history.append(scenario)

            weights = request_weights(rng, profile_weights, scenario)
            requirements = request_requirements(rng, weights, scenario)
            vias = request_vias(rng, raw_request)

            requests.append(
                normalize_request(
                    raw_request,
                    weights,
                    requirements,
                    vias,
                )
            )

        force_requirement_variation(requests)

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


def validate(data):
    if data["user_count"] != 1000:
        raise ValueError(f"user_count must be 1000, got {data['user_count']}")
    if data["total_request_count"] != 5000:
        raise ValueError(f"total_request_count must be 5000, got {data['total_request_count']}")

    persona_counts = {key: 0 for key in PERSONAS}

    for user in data["users"]:
        persona = user["profile"].get("persona")
        if persona not in PERSONAS:
            raise ValueError(f"{user['sample_id']}: invalid persona {persona}")
        persona_counts[persona] += 1

        profile_weights = user["profile"]["weights"]
        if set(profile_weights) != set(WEIGHT_KEYS):
            raise ValueError(f"{user['sample_id']}: bad profile weights")

        if any(not (1 <= value <= 5) for value in profile_weights.values()):
            raise ValueError(f"{user['sample_id']}: profile weight outside 1..5")

        request_weight_signatures = []
        requirement_signatures = []
        differs_from_profile = False

        for request in user["requests"]:
            if not in_seoul(request["start"]):
                raise ValueError(f"{user['sample_id']}: start outside Seoul bounds")
            if request.get("end") is not None and not in_seoul(request["end"]):
                raise ValueError(f"{user['sample_id']}: end outside Seoul bounds")
            for via in request.get("vias", []):
                if not in_seoul(via):
                    raise ValueError(f"{user['sample_id']}: via outside Seoul bounds")

            if set(request["weights"]) != set(WEIGHT_KEYS):
                raise ValueError(f"{user['sample_id']}: request is missing weights")
            if any(not (1 <= value <= 5) for value in request["weights"].values()):
                raise ValueError(f"{user['sample_id']}: request weight outside 1..5")

            if set(request.get("requirements", {})) - set(BOOL_REQUIREMENTS):
                raise ValueError(f"{user['sample_id']}: unsupported requirements")

            request_weight_signatures.append(
                tuple(request["weights"][key] for key in WEIGHT_KEYS)
            )
            requirement_signatures.append(
                signature(request.get("requirements", {}))
            )

            if request["weights"] != profile_weights:
                differs_from_profile = True

        if len(set(request_weight_signatures)) == 1:
            raise ValueError(f"{user['sample_id']}: all request weights are identical")
        if len(set(requirement_signatures)) == 1:
            raise ValueError(f"{user['sample_id']}: all request requirements are identical")
        if not differs_from_profile:
            raise ValueError(
                f"{user['sample_id']}: stated request weights never differ from latent profile"
            )

    # 모든 persona가 실제 생성됐는지 최소 sanity check
    missing_personas = [key for key, count in persona_counts.items() if count == 0]
    if missing_personas:
        raise ValueError(f"missing personas: {missing_personas}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    data = json.loads(args.source.read_text(encoding="utf-8-sig"))
    generated = regenerate(data)
    validate(generated)

    args.output.write_text(
        json.dumps(generated, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(args.output)


if __name__ == "__main__":
    main()
