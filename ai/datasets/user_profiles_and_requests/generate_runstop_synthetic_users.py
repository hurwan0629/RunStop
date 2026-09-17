import argparse
import json
import math
import random
from pathlib import Path


SEED = 20260914
HERE = Path(__file__).resolve().parent
DEFAULT_SOURCE = HERE / "previous_version" / "runstop_users_1000_5000_requests.json"
DEFAULT_OUTPUT = HERE / "runstop_users_1000_5000_requests.json"

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

SCENARIOS = {
    "normal": {},
    "easy": {"elevation": 1, "surface": 1},
    "quick": {"distance": 1, "flow": 1},
    "night": {"safety": 1, "night": 1},
    "nature": {"nature": 1, "park": 1},
    "facility": {"toilet": 1, "store": 1},
    "explore": {"nature": 1, "overlap": 1, "distance": -1},
}

SCENARIO_WEIGHTS = {
    "normal": 4,
    "easy": 2,
    "quick": 2,
    "night": 2,
    "nature": 2,
    "facility": 2,
    "explore": 1,
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


def complete_profile_weights(raw):
    weights = {key: clamp_weight(raw[key]) for key in raw if key in WEIGHT_KEYS}

    if "safety" not in weights:
        weights["safety"] = clamp_weight(max(weights.get("night", 3), 3))
    if "nature" not in weights:
        weights["nature"] = clamp_weight(weights.get("park", 3))
    if "overlap" not in weights:
        weights["overlap"] = clamp_weight(3 + (weights.get("distance", 3) - 3) * 0.5)

    for key in WEIGHT_KEYS:
        weights.setdefault(key, 3)

    return {key: weights[key] for key in WEIGHT_KEYS}


def request_weights(rng, profile_weights, scenario):
    weights = {}

    for key, value in profile_weights.items():
        noise = rng.choices([-1, 0, 1], weights=[1, 6, 1], k=1)[0]
        weights[key] = clamp_weight(value + noise)

    for key, delta in SCENARIOS[scenario].items():
        weights[key] = clamp_weight(weights[key] + delta)

    return weights


def request_requirements(rng, weights, scenario):
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
        profile = dict(user["profile"])
        profile["weights"] = complete_profile_weights(profile["weights"])

        requests = []
        for raw_request in user["requests"]:
            scenario = weighted_choice(rng, SCENARIO_WEIGHTS)
            weights = request_weights(rng, profile["weights"], scenario)
            requirements = request_requirements(rng, weights, scenario)
            vias = request_vias(rng, raw_request)
            requests.append(normalize_request(raw_request, weights, requirements, vias))

        force_requirement_variation(requests)

        users.append({
            "sample_id": user.get("sample_id", user.get("sampleId")),
            "profile": profile,
            "requests": requests,
        })

    return {
        "dataset_name": "RunStop synthetic users with request-level preferences",
        "version": "2.0",
        "seed": SEED,
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

    for user in data["users"]:
        profile_weights = user["profile"]["weights"]
        if set(profile_weights) != set(WEIGHT_KEYS):
            raise ValueError(f"{user['sample_id']}: bad profile weights")

        request_weight_signatures = []
        requirement_signatures = []

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
            if set(request.get("requirements", {})) - set(BOOL_REQUIREMENTS):
                raise ValueError(f"{user['sample_id']}: unsupported requirements")

            request_weight_signatures.append(tuple(request["weights"][key] for key in WEIGHT_KEYS))
            requirement_signatures.append(signature(request.get("requirements", {})))

        if len(set(request_weight_signatures)) == 1:
            raise ValueError(f"{user['sample_id']}: all request weights are identical")
        if len(set(requirement_signatures)) == 1:
            raise ValueError(f"{user['sample_id']}: all request requirements are identical")


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
