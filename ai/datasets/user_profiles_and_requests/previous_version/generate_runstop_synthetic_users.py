import json
import random
import math
from pathlib import Path
from collections import Counter

# ============================================================
# RunStop synthetic user/request dataset generator (v4)
#
# Output:
#   1,000 users
#   5 requests / user
#   5,000 requests total
#
# Design:
#   profile.weights
#       = fixed long-term user preference
#
#   requests[i].elementConditions.weights
#       = request-specific preference
#         (profile weights +/- small contextual variation)
#
#   requests[i].elementConditions.requirements
#       = request-specific HARD constraints
#         (not mechanically identical across all 5 requests)
#
# Request schema follows:
#   backend/src/dto/route/route-request.dto.ts
#   backend/src/dto/route/route-coordinate.dto.ts
#
# Only fields that are actually useful to the current Python parser are
# generated: routeType, startPoint, waypoints, endPoint,
# elementConditions.targetDistance / weights / requirements.
#
# NOTE:
#   The Node DTO currently has maxSlope / facilityCount, but the current
#   routing-worker parser does not forward them to recommend(), so this
#   generator intentionally omits them.
# ============================================================

SEED = 20260913
random.seed(SEED)

INPUT = Path("/mnt/data/user_samples_500_with_gpt_choices.json")
OUTPUT = Path("/mnt/data/runstop_users_1000_requests_5000_schema_v4.json")

with INPUT.open("r", encoding="utf-8") as f:
    source = json.load(f)

original_users = source["users"]

WEIGHT_KEYS = [
    "distance",
    "elevation",
    "safety",
    "night",
    "nature",
    "park",
    "surface",
    "flow",
    "overlap",
    "toilet",
    "store",
]

BOOL_REQUIREMENT_KEYS = ["toilet", "store", "park", "no_stairs"]

SEOUL_BOUNDS = {
    "lat_min": 37.413,
    "lat_max": 37.715,
    "lng_min": 126.734,
    "lng_max": 127.269,
}

def in_seoul(lat, lng):
    return (
        SEOUL_BOUNDS["lat_min"] <= lat <= SEOUL_BOUNDS["lat_max"]
        and SEOUL_BOUNDS["lng_min"] <= lng <= SEOUL_BOUNDS["lng_max"]
    )

def clamp_weight(value):
    return max(1, min(5, int(round(value))))

def weighted_choice(weight_map):
    keys = list(weight_map.keys())
    return random.choices(
        keys,
        weights=[weight_map[k] for k in keys],
        k=1,
    )[0]

def point_obj(point, sequence=None):
    obj = {
        "lat": round(float(point[0]), 7),
        "lng": round(float(point[1]), 7),
    }
    if sequence is not None:
        obj["sequence"] = sequence
    return obj

def haversine_m(a, b):
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    x = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )
    return 6371000 * 2 * math.asin(math.sqrt(x))

def destination_point(start, distance_m, bearing_deg):
    """
    Move distance_m meters from start using a spherical-earth approximation.
    Retries are handled by callers if the result leaves Seoul.
    """
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

    return (
        round(math.degrees(lat2), 7),
        round(math.degrees(lon2), 7),
    )

def local_point(start, min_distance_m, max_distance_m):
    """
    Generate a point near start while guaranteeing Seoul bounds.
    """
    for _ in range(50):
        distance = random.uniform(min_distance_m, max_distance_m)
        bearing = random.uniform(0, 360)
        point = destination_point(start, distance, bearing)

        if in_seoul(*point):
            return point

    return start

# ------------------------------------------------------------
# 1. Seoul coordinate seeds from the original data
# ------------------------------------------------------------
coord_pool = []

for user in original_users:
    start = user.get("request", {}).get("start")

    if isinstance(start, list) and len(start) == 2:
        point = (float(start[0]), float(start[1]))

        if in_seoul(*point):
            coord_pool.append(point)

coord_pool = list(dict.fromkeys(coord_pool))

# Fallback anchors are all inside Seoul.
fallback_points = [
    (37.4979, 127.0276),  # Gangnam
    (37.5219, 126.9245),  # Yeouido
    (37.5446, 127.0374),  # Seoul Forest
    (37.5133, 127.1001),  # Jamsil
    (37.5716, 126.9769),  # Gwanghwamun
    (37.5563, 126.9236),  # Hongdae
    (37.5826, 127.0018),  # Daehak-ro
    (37.5657, 127.0089),  # Dongdaemun
    (37.5350, 127.0947),  # Gwangnaru
    (37.5512, 126.9882),  # Namsan
    (37.5474, 127.0474),  # Seongsu
    (37.5126, 127.0592),  # Samseong
    (37.5045, 127.0490),  # Seolleung
    (37.4842, 126.9297),  # Sillim
    (37.4765, 126.9816),  # Sadang
    (37.6543, 127.0602),  # Nowon
    (37.6112, 126.9291),  # Yeonsinnae
    (37.5796, 126.9770),  # Gyeongbokgung
    (37.5284, 126.9650),  # Yongsan
    (37.5567, 126.9459),  # Sinchon
]

for point in fallback_points:
    if point not in coord_pool:
        coord_pool.append(point)

# ------------------------------------------------------------
# 2. Persona definitions
# ------------------------------------------------------------
persona_descriptions = {}
persona_counts = Counter()

for user in original_users:
    persona = user["persona"]
    persona_counts[persona] += 1
    persona_descriptions.setdefault(
        persona,
        user.get("persona_description", ""),
    )

# Long-term preference centers.
# Existing source weights are preserved for keys already present in source.
# New algorithm keys (safety, nature, overlap, etc.) are filled by persona.
PERSONA_CENTERS = {
    "초보·회복 러너": {
        "distance": 5, "elevation": 5, "safety": 4, "night": 2,
        "nature": 2, "park": 2, "surface": 4, "flow": 2,
        "overlap": 3, "toilet": 4, "store": 3,
    },
    "일상 러너": {
        "distance": 4, "elevation": 3, "safety": 3, "night": 3,
        "nature": 3, "park": 3, "surface": 3, "flow": 3,
        "overlap": 3, "toilet": 2, "store": 4,
    },
    "야간 안전 러너": {
        "distance": 3, "elevation": 3, "safety": 5, "night": 5,
        "nature": 2, "park": 2, "surface": 4, "flow": 3,
        "overlap": 3, "toilet": 3, "store": 4,
    },
    "장거리 훈련 러너": {
        "distance": 5, "elevation": 4, "safety": 3, "night": 3,
        "nature": 3, "park": 3, "surface": 3, "flow": 3,
        "overlap": 4, "toilet": 4, "store": 4,
    },
    "편의시설 선호 러너": {
        "distance": 3, "elevation": 2, "safety": 3, "night": 3,
        "nature": 2, "park": 2, "surface": 3, "flow": 2,
        "overlap": 3, "toilet": 5, "store": 5,
    },
    "자연 선호 러너": {
        "distance": 2, "elevation": 3, "safety": 3, "night": 2,
        "nature": 5, "park": 5, "surface": 4, "flow": 2,
        "overlap": 3, "toilet": 2, "store": 2,
    },
    "시간 효율 러너": {
        "distance": 5, "elevation": 3, "safety": 3, "night": 2,
        "nature": 1, "park": 1, "surface": 3, "flow": 5,
        "overlap": 2, "toilet": 2, "store": 1,
    },
    "저충격 러너": {
        "distance": 4, "elevation": 5, "safety": 4, "night": 2,
        "nature": 3, "park": 3, "surface": 5, "flow": 3,
        "overlap": 3, "toilet": 3, "store": 2,
    },
}

# targetDistance: meters
PERSONA_DISTANCE = {
    "초보·회복 러너": (3500, 2000, 5500),
    "일상 러너": (5000, 3000, 8000),
    "야간 안전 러너": (4500, 2500, 7000),
    "장거리 훈련 러너": (9000, 6000, 15000),
    "편의시설 선호 러너": (4500, 2500, 7500),
    "자연 선호 러너": (6500, 3500, 11000),
    "시간 효율 러너": (4000, 2000, 6500),
    "저충격 러너": (4000, 2000, 6500),
}

PERSONA_ROUTE_PROBS = {
    "초보·회복 러너": {
        "LOOP": 0.60, "ROUND_TRIP": 0.25, "ONE_WAY": 0.15,
    },
    "일상 러너": {
        "LOOP": 0.50, "ROUND_TRIP": 0.25, "ONE_WAY": 0.25,
    },
    "야간 안전 러너": {
        "LOOP": 0.55, "ROUND_TRIP": 0.25, "ONE_WAY": 0.20,
    },
    "장거리 훈련 러너": {
        "LOOP": 0.40, "ROUND_TRIP": 0.35, "ONE_WAY": 0.25,
    },
    "편의시설 선호 러너": {
        "LOOP": 0.55, "ROUND_TRIP": 0.20, "ONE_WAY": 0.25,
    },
    "자연 선호 러너": {
        "LOOP": 0.50, "ROUND_TRIP": 0.35, "ONE_WAY": 0.15,
    },
    "시간 효율 러너": {
        "LOOP": 0.35, "ROUND_TRIP": 0.15, "ONE_WAY": 0.50,
    },
    "저충격 러너": {
        "LOOP": 0.55, "ROUND_TRIP": 0.30, "ONE_WAY": 0.15,
    },
}

# Temporary context that changes only the current request.
SCENARIOS = {
    "normal": {},
    "easy": {
        "elevation": 1,
        "surface": 1,
    },
    "quick": {
        "distance": 1,
        "flow": 1,
    },
    "night": {
        "safety": 1,
        "night": 1,
    },
    "nature": {
        "nature": 1,
        "park": 1,
    },
    "facility": {
        "toilet": 1,
        "store": 1,
    },
    "explore": {
        "nature": 1,
        "overlap": 1,
        "distance": -1,
    },
}

PERSONA_SCENARIO_WEIGHTS = {
    "초보·회복 러너": {
        "normal": 3, "easy": 5, "quick": 2, "night": 1,
        "nature": 1, "facility": 3, "explore": 1,
    },
    "일상 러너": {
        "normal": 5, "easy": 2, "quick": 3, "night": 2,
        "nature": 2, "facility": 2, "explore": 2,
    },
    "야간 안전 러너": {
        "normal": 3, "easy": 2, "quick": 2, "night": 6,
        "nature": 1, "facility": 2, "explore": 1,
    },
    "장거리 훈련 러너": {
        "normal": 4, "easy": 1, "quick": 1, "night": 1,
        "nature": 2, "facility": 3, "explore": 3,
    },
    "편의시설 선호 러너": {
        "normal": 3, "easy": 1, "quick": 2, "night": 1,
        "nature": 1, "facility": 6, "explore": 1,
    },
    "자연 선호 러너": {
        "normal": 3, "easy": 1, "quick": 1, "night": 1,
        "nature": 6, "facility": 1, "explore": 4,
    },
    "시간 효율 러너": {
        "normal": 3, "easy": 1, "quick": 7, "night": 1,
        "nature": 1, "facility": 1, "explore": 1,
    },
    "저충격 러너": {
        "normal": 3, "easy": 7, "quick": 1, "night": 1,
        "nature": 2, "facility": 1, "explore": 1,
    },
}

def make_profile_weights(
    persona,
    original_weights=None,
    preserve_original=False,
):
    center = PERSONA_CENTERS[persona]
    result = {}

    for key in WEIGHT_KEYS:
        if (
            preserve_original
            and original_weights
            and key in original_weights
        ):
            result[key] = clamp_weight(original_weights[key])
            continue

        # Small user-to-user individuality around persona center.
        delta = random.choices(
            [-1, 0, 1],
            weights=[0.15, 0.70, 0.15],
            k=1,
        )[0]

        result[key] = clamp_weight(center[key] + delta)

    return result

def make_request_weights(profile_weights, scenario):
    """
    Request weight = user baseline + small per-request noise + coherent context.
    The user identity does not change; only today's emphasis changes.
    """
    result = {}

    for key, baseline in profile_weights.items():
        noise = random.choices(
            [-1, 0, 1],
            weights=[0.10, 0.80, 0.10],
            k=1,
        )[0]
        result[key] = clamp_weight(baseline + noise)

    for key, delta in SCENARIOS[scenario].items():
        result[key] = clamp_weight(result[key] + delta)

    return result

def make_requirements(persona, weights, scenario):
    """
    HARD constraints vary request-to-request.

    A strong preference raises the probability of becoming a requirement,
    but does not make it permanent.
    """
    req = {}

    p_toilet = 0.04 + 0.08 * max(0, weights["toilet"] - 2)
    p_store = 0.03 + 0.07 * max(0, weights["store"] - 2)
    p_park = 0.03 + 0.08 * max(
        0,
        max(weights["park"], weights["nature"]) - 2,
    )
    p_no_stairs = 0.04 + 0.08 * max(
        0,
        max(weights["surface"], weights["elevation"]) - 2,
    )

    # Persona priors
    if persona in {"초보·회복 러너", "저충격 러너"}:
        p_no_stairs += 0.18

    if persona == "편의시설 선호 러너":
        p_toilet += 0.12
        p_store += 0.14

    if persona == "자연 선호 러너":
        p_park += 0.18

    # Today's context
    if scenario == "easy":
        p_no_stairs += 0.16
    elif scenario == "facility":
        p_toilet += 0.18
        p_store += 0.18
    elif scenario == "nature":
        p_park += 0.20

    # Do not let one requirement become effectively permanent.
    p_toilet = min(p_toilet, 0.68)
    p_store = min(p_store, 0.64)
    p_park = min(p_park, 0.68)
    p_no_stairs = min(p_no_stairs, 0.72)

    if random.random() < p_toilet:
        req["toilet"] = True

    if random.random() < p_store:
        req["store"] = True

    if random.random() < p_park:
        req["park"] = True

    if random.random() < p_no_stairs:
        req["no_stairs"] = True

    return req

def make_target_distance(persona, scenario):
    center, low, high = PERSONA_DISTANCE[persona]

    sigma = max((high - low) / 5.0, 400)
    value = random.gauss(center, sigma)

    if scenario == "quick":
        value *= random.uniform(0.65, 0.85)
    elif scenario == "easy":
        value *= random.uniform(0.78, 0.95)
    elif scenario == "explore":
        value *= random.uniform(1.05, 1.20)

    value = max(low, min(high, value))

    # Avoid fake precision.
    return int(round(value / 100.0) * 100)

def choose_start(base_point):
    """
    One user usually runs near their base area,
    but sometimes starts elsewhere in Seoul.
    """
    if random.random() < 0.80:
        return local_point(base_point, 0, 700)

    other_base = random.choice(coord_pool)
    return local_point(other_base, 0, 500)

def choose_end_for_one_way(start, target_distance):
    """
    Straight-line endpoint distance:
      ~35% to ~65% of requested route length.

    This leaves realistic room for the road-network route to be longer.
    """
    min_distance = max(700, target_distance * 0.35)
    max_distance = max(min_distance + 200, target_distance * 0.65)

    return local_point(
        start,
        min_distance,
        max_distance,
    )

def make_waypoints(route_type, start, end, target_distance):
    # Around 12% of requests exercise the via-generation path.
    if random.random() >= 0.12:
        return []

    if route_type == "ONE_WAY" and end is not None:
        # Put waypoint roughly near the corridor between start and end,
        # then add a small side offset.
        mid = (
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2,
        )
        waypoint = local_point(
            mid,
            100,
            max(250, target_distance * 0.12),
        )
    else:
        waypoint = local_point(
            start,
            max(250, target_distance * 0.10),
            max(500, target_distance * 0.28),
        )

    return [point_obj(waypoint, sequence=0)]

def make_request(
    persona,
    profile_weights,
    base_point,
):
    scenario = weighted_choice(
        PERSONA_SCENARIO_WEIGHTS[persona]
    )

    request_weights = make_request_weights(
        profile_weights,
        scenario,
    )

    requirements = make_requirements(
        persona,
        request_weights,
        scenario,
    )

    target_distance = make_target_distance(
        persona,
        scenario,
    )

    route_type = weighted_choice(
        PERSONA_ROUTE_PROBS[persona]
    )

    start = choose_start(base_point)

    end = None

    if route_type == "ONE_WAY":
        end = choose_end_for_one_way(
            start,
            target_distance,
        )

    waypoints = make_waypoints(
        route_type,
        start,
        end,
        target_distance,
    )

    request = {
        "routeType": route_type,
        "startPoint": point_obj(start),
        "waypoints": waypoints,
        "elementConditions": {
            "targetDistance": target_distance,
            "weights": request_weights,
            "requirements": requirements,
        },
    }

    if end is not None:
        request["endPoint"] = point_obj(end)

    return request

def requirement_signature(request):
    return tuple(
        sorted(
            request["elementConditions"]["requirements"].keys()
        )
    )

def force_requirement_variation(user_requests, persona):
    """
    Guarantee at least two different requirement sets in each user's 5 requests.
    """
    signatures = [
        requirement_signature(req)
        for req in user_requests
    ]

    if len(set(signatures)) > 1:
        return

    req = user_requests[-1]["elementConditions"]["requirements"]
    weights = user_requests[-1]["elementConditions"]["weights"]

    preferred_keys = []

    if max(weights["surface"], weights["elevation"]) >= 4:
        preferred_keys.append("no_stairs")

    if weights["toilet"] >= 4:
        preferred_keys.append("toilet")

    if weights["store"] >= 4:
        preferred_keys.append("store")

    if max(weights["park"], weights["nature"]) >= 4:
        preferred_keys.append("park")

    preferred_keys += [
        "no_stairs",
        "toilet",
        "store",
        "park",
    ]

    # Deduplicate preserving order.
    preferred_keys = list(dict.fromkeys(preferred_keys))

    current = set(req.keys())

    # First try adding a new hard requirement.
    for key in preferred_keys:
        if key not in current:
            req[key] = True
            return

    # If all four already exist, remove one.
    if current:
        del req[next(iter(current))]

# ------------------------------------------------------------
# 3. Build 1,000 users
# ------------------------------------------------------------
users = []

# Existing 500 samples become the first 500 persistent user profiles.
for index, source_user in enumerate(original_users, start=1):
    persona = source_user["persona"]

    profile_weights = make_profile_weights(
        persona,
        original_weights=source_user.get("weights", {}),
        preserve_original=True,
    )

    original_start = source_user.get("request", {}).get("start")

    if (
        isinstance(original_start, list)
        and len(original_start) == 2
        and in_seoul(
            float(original_start[0]),
            float(original_start[1]),
        )
    ):
        base_point = (
            float(original_start[0]),
            float(original_start[1]),
        )
    else:
        base_point = random.choice(coord_pool)

    requests = [
        make_request(
            persona,
            profile_weights,
            base_point,
        )
        for _ in range(5)
    ]

    force_requirement_variation(
        requests,
        persona,
    )

    users.append({
        "sampleId": f"U{index:04d}",
        "profile": {
            "persona": persona,
            "personaDescription": persona_descriptions[persona],
            "weights": profile_weights,
        },
        "requests": requests,
    })

# New 500 users follow the original persona distribution.
persona_population = []

for persona, count in persona_counts.items():
    target = round(
        count / len(original_users) * 500
    )
    persona_population.extend(
        [persona] * target
    )

while len(persona_population) < 500:
    persona_population.append(
        random.choice(list(persona_counts.keys()))
    )

while len(persona_population) > 500:
    persona_population.pop()

random.shuffle(persona_population)

for index, persona in enumerate(
    persona_population,
    start=501,
):
    profile_weights = make_profile_weights(
        persona,
        preserve_original=False,
    )

    base_point = random.choice(coord_pool)

    requests = [
        make_request(
            persona,
            profile_weights,
            base_point,
        )
        for _ in range(5)
    ]

    force_requirement_variation(
        requests,
        persona,
    )

    users.append({
        "sampleId": f"U{index:04d}",
        "profile": {
            "persona": persona,
            "personaDescription": persona_descriptions[persona],
            "weights": profile_weights,
        },
        "requests": requests,
    })

dataset = {
    "datasetName": "RunStop synthetic users with repeated route requests",
    "version": "4.0",
    "seed": SEED,
    "userCount": 1000,
    "requestsPerUser": 5,
    "totalRequestCount": 5000,
    "schemaBasis": {
        "branch": "personal/hurwan",
        "requestDto": "backend/src/dto/route/route-request.dto.ts",
        "coordinateDto": "backend/src/dto/route/route-coordinate.dto.ts",
        "targetDistanceUnit": "meters",
    },
    "users": users,
}

# ------------------------------------------------------------
# 4. Validation
# ------------------------------------------------------------
assert len(users) == 1000
assert sum(len(u["requests"]) for u in users) == 5000
assert len({u["sampleId"] for u in users}) == 1000

identical_requirement_users = 0
identical_weight_users = 0

for user in users:
    profile_weights = user["profile"]["weights"]

    assert set(profile_weights.keys()) == set(WEIGHT_KEYS)

    requirement_signatures = []
    request_weight_signatures = []

    for request in user["requests"]:
        assert request["routeType"] in {
            "LOOP",
            "ROUND_TRIP",
            "ONE_WAY",
        }

        start = request["startPoint"]
        assert in_seoul(
            start["lat"],
            start["lng"],
        )

        for waypoint in request["waypoints"]:
            assert in_seoul(
                waypoint["lat"],
                waypoint["lng"],
            )

        if request["routeType"] == "ONE_WAY":
            assert "endPoint" in request

            end = request["endPoint"]

            assert in_seoul(
                end["lat"],
                end["lng"],
            )

            straight_distance = haversine_m(
                (start["lat"], start["lng"]),
                (end["lat"], end["lng"]),
            )

            target_distance = request[
                "elementConditions"
            ]["targetDistance"]

            assert straight_distance >= min(
                650,
                target_distance * 0.30,
            )

        else:
            assert "endPoint" not in request

        conditions = request["elementConditions"]

        assert conditions["targetDistance"] > 0
        assert set(conditions["weights"].keys()) == set(WEIGHT_KEYS)

        for key, value in conditions["weights"].items():
            assert 1 <= value <= 5

        for key, value in conditions["requirements"].items():
            assert key in BOOL_REQUIREMENT_KEYS
            assert value is True

        requirement_signatures.append(
            tuple(
                sorted(
                    conditions["requirements"].keys()
                )
            )
        )

        request_weight_signatures.append(
            tuple(
                conditions["weights"][key]
                for key in WEIGHT_KEYS
            )
        )

    if len(set(requirement_signatures)) == 1:
        identical_requirement_users += 1

    if len(set(request_weight_signatures)) == 1:
        identical_weight_users += 1

assert identical_requirement_users == 0
assert identical_weight_users == 0

with OUTPUT.open("w", encoding="utf-8") as f:
    json.dump(
        dataset,
        f,
        ensure_ascii=False,
        indent=2,
    )

route_counts = Counter(
    request["routeType"]
    for user in users
    for request in user["requests"]
)

requirement_counts = Counter(
    key
    for user in users
    for request in user["requests"]
    for key in request["elementConditions"]["requirements"]
)

waypoint_count = sum(
    bool(request["waypoints"])
    for user in users
    for request in user["requests"]
)

print("Generated:", OUTPUT)
print("users:", len(users))
print("requests:", sum(len(u["requests"]) for u in users))
print("same requirements across all 5:", identical_requirement_users)
print("same request weights across all 5:", identical_weight_users)
print("route types:", dict(route_counts))
print("requirements:", dict(requirement_counts))
print("requests with waypoint:", waypoint_count)
