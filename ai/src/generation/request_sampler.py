"""Normalize legacy snake_case and Node DTO camelCase inputs into one contract."""
from ai.src.generation.user_sampler import check_weights, numeric, REQUIREMENTS


def coordinate(value):
    if isinstance(value, dict):
        value = [value["lat"], value["lng"]]
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise ValueError("좌표는 [위도, 경도] 또는 {lat,lng}여야 합니다")
    return [numeric(value[0], "latitude", -90, 90), numeric(value[1], "longitude", -180, 180)]


def normalize_requests(users):
    jobs = []
    for user in users:
        for sequence, raw in enumerate(user["requests"], 1):
            if "routeType" in raw:
                conditions = raw["elementConditions"]
                if conditions.get("maxSlope") is not None or conditions.get("facilityCount") is not None:
                    raise ValueError("maxSlope/facilityCount는 현재 worker에서 전달되지 않습니다. requirements 규격을 사용하세요")
                args = {"route_type": raw["routeType"], "start": coordinate(raw["startPoint"]),
                        "target_km": numeric(conditions["targetDistance"], "targetDistance", 0.001, 1000000) / 1000,
                        "weights": conditions["weights"], "requirements": conditions.get("requirements", {}),
                        "vias": [coordinate(p) for p in raw.get("waypoints", [])]}
                end = raw.get("endPoint")
            else:
                args = {"route_type": raw["route_type"], "start": coordinate(raw["start"]),
                        "target_km": numeric(raw["target_km"], "target_km", 0.000001, 1000),
                        "weights": raw.get("weights", user["profile"]["weights"]),
                        "requirements": raw.get("requirements", {}),
                        "vias": [coordinate(p) for p in raw.get("vias", [])]}
                end = raw.get("end")
            if args["route_type"] not in {"LOOP", "ONE_WAY", "ROUND_TRIP"}:
                raise ValueError(f"알 수 없는 경로 유형: {args['route_type']}")
            if args["route_type"] == "ONE_WAY" and end is None:
                raise ValueError("ONE_WAY에는 end가 필요합니다")
            args["end"] = coordinate(end) if end is not None else None
            args["weights"] = check_weights(args["weights"])
            req = args["requirements"]
            if not isinstance(req, dict) or set(req) - set(REQUIREMENTS):
                raise ValueError(f"지원하지 않는 필수조건: {req}")
            for key, value in req.items():
                if key == "max_slope_pct":
                    numeric(value, key, 0, 1000)
                elif type(value) is not bool:
                    raise ValueError(f"{key}: boolean이어야 합니다")
            jobs.append({"user_id": user["user_id"], "request_id": f"{user['user_id']}:{sequence:04d}",
                         "request_sequence": sequence, "profile": user["profile"], "args": args})
    return jobs


def request_features(job):
    args = job["args"]
    row = {"user_id": job["user_id"], "request_id": job["request_id"], "request_sequence": job["request_sequence"],
           "request_target_distance_m": args["target_km"] * 1000, "request_via_count": len(args["vias"])}
    for mode in ("LOOP", "ONE_WAY", "ROUND_TRIP"):
        row[f"request_type_{mode.lower()}"] = int(args["route_type"] == mode)
    for prefix, weights in (("user_weight", job["profile"]["weights"]), ("request_weight", args["weights"])):
        for key in ("distance", "elevation", "toilet", "store", "night", "park", "flow", "surface", "overlap", "safety", "nature"):
            row[f"{prefix}_{key}"] = float(weights.get(key, 0))
    for key in REQUIREMENTS:
        row[f"requirements_{key}"] = args["requirements"].get(key, None if key == "max_slope_pct" else False)
    return row
