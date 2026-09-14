"""snake_case 예전 입력과 Node DTO camelCase 입력을 하나의 요청 계약으로 맞춥니다."""

from typing import Any
from ai.src.generation.user_sampler import check_weights, numeric, REQUIREMENTS


def coordinate(value: Any) -> list[float]:
    """좌표를 [lat, lng] 리스트로 표준화하고 범위를 검증합니다."""

    # {lat, lng} 형식을 [lat, lng] 형식으로 변환
    if isinstance(value, dict):
        value = [value["lat"], value["lng"]]

    # 좌표는 반드시 위도, 경도 2개 값이어야 함
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise ValueError("좌표는 [위도, 경도] 또는 {lat,lng}여야 합니다")

    # 숫자 여부와 위도/경도 범위 검사
    return [
        numeric(value[0], "latitude", -90, 90),
        numeric(value[1], "longitude", -180, 180),
    ]

"""
users 스키마 예시:

[
    {
        "user_id": "user_0001",

        "profile": {
            "weights": {
                "distance": 5,
                "elevation": 3,
                "toilet": 2,
                "store": 2,
                "night": 1,
                "park": 4,
                "flow": 3,
                "surface": 2,
                "overlap": 1,
                "safety": 5,
                "nature": 4
            }
        },

        "requests": [
            # legacy snake_case 형식
            {
                "route_type": "LOOP",
                "start": [37.5, 127.0],
                "end": None,
                "target_km": 5.0,
                "weights": {...},          # 생략 시 profile.weights 사용
                "requirements": {...},
                "vias": [[37.51, 127.01]]
            },

            # 또는 Node DTO camelCase 형식
            {
                "routeType": "LOOP",
                "startPoint": {"lat": 37.5, "lng": 127.0},
                "endPoint": None,
                "waypoints": [],
                "elementConditions": {
                    "targetDistance": 5000,   # meter
                    "weights": {...},
                    "requirements": {...}
                }
            }
        ]
    }
]
▲ ▲ users 스키마 예시 ▲ ▲
"""
def normalize_requests(users: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """사용자별 요청 배열을 worker가 받을 job 목록으로 변환합니다."""

    jobs = []

    # 사용자 JSON 순서를 request_sequence로 사용
    for user in users:
        for sequence, raw in enumerate(user["requests"], 1):

            # Node DTO camelCase 입력
            if "routeType" in raw:
                conditions = raw["elementConditions"]

                # 현재 worker에서 직접 전달하지 않는 값은 막음
                if conditions.get("maxSlope") is not None or conditions.get("facilityCount") is not None:
                    raise ValueError("maxSlope/facilityCount는 현재 worker에서 전달되지 않습니다. requirements 규격을 사용하세요")

                args = {
                    "route_type": raw["routeType"],
                    "start": coordinate(raw["startPoint"]),
                    # Node DTO의 targetDistance는 meter이므로 km로 변환
                    "target_km": numeric(conditions["targetDistance"], "targetDistance", 0.001, 1000000) / 1000,
                    "weights": conditions["weights"],
                    "requirements": conditions.get("requirements", {}),
                    "vias": [coordinate(p) for p in raw.get("waypoints", [])],
                }

                end = raw.get("endPoint")

            # 기존 snake_case 입력
            else:
                args = {
                    "route_type": raw["route_type"],
                    "start": coordinate(raw["start"]),
                    "target_km": numeric(raw["target_km"], "target_km", 0.000001, 1000),
                    # 요청 weight가 없으면 사용자 기본 profile weight 사용
                    "weights": raw.get("weights", user["profile"]["weights"]),
                    "requirements": raw.get("requirements", {}),
                    "vias": [coordinate(p) for p in raw.get("vias", [])],
                }

                end = raw.get("end")

            # 지원하는 경로 유형인지 검사
            if args["route_type"] not in {"LOOP", "ONE_WAY", "ROUND_TRIP"}:
                raise ValueError(f"알 수 없는 경로 유형: {args['route_type']}")

            # 편도 경로는 반드시 도착지가 필요
            if args["route_type"] == "ONE_WAY" and end is None:
                raise ValueError("ONE_WAY에는 end가 필요합니다")

            # 도착지가 존재하면 동일한 좌표 형식으로 변환
            args["end"] = coordinate(end) if end is not None else None

            # 사용자 선호 weight 값 검증
            args["weights"] = check_weights(args["weights"])

            # requirements에 정의되지 않은 조건이 들어왔는지 검사
            req = args["requirements"]

            if not isinstance(req, dict) or set(req) - set(REQUIREMENTS):
                raise ValueError(f"지원하지 않는 필수조건: {req}")

            # max_slope_pct는 숫자, 나머지 requirement는 bool이어야 함
            for key, value in req.items():
                if key == "max_slope_pct":
                    numeric(value, key, 0, 1000)
                elif type(value) is not bool:
                    raise ValueError(f"{key}: boolean이어야 합니다")

            # routing-worker가 처리할 하나의 job으로 저장
            jobs.append({
                "user_id": user["user_id"],
                "request_id": f"{user['user_id']}:{sequence:04d}",
                "request_sequence": sequence,
                "profile": user["profile"],
                "args": args,
            })

    return jobs


def request_features(job: dict[str, Any]) -> dict[str, Any]:
    """job의 사용자/요청 조건을 후보 행에 붙일 context feature로 펼칩니다."""

    args = job["args"]

    # 요청 자체의 기본 feature
    row = {
        "user_id": job["user_id"],
        "request_id": job["request_id"],
        "request_sequence": job["request_sequence"],
        "request_target_distance_m": args["target_km"] * 1000,
        "request_via_count": len(args["vias"]),
    }

    # 경로 타입을 one-hot 형태의 숫자 feature로 변환
    for mode in ("LOOP", "ONE_WAY", "ROUND_TRIP"):
        row[f"request_type_{mode.lower()}"] = int(args["route_type"] == mode)

    # 사용자 기본 선호와 현재 요청 선호를 각각 feature로 저장
    for prefix, weights in (("user_weight", job["profile"]["weights"]), ("request_weight", args["weights"])):
        for key in ("distance", "elevation", "toilet", "store", "night", "park", "flow", "surface", "overlap", "safety", "nature"):
            row[f"{prefix}_{key}"] = float(weights.get(key, 0))

    # 필수 조건(requirements)도 모델 입력 feature로 추가
    for key in REQUIREMENTS:
        row[f"requirements_{key}"] = args["requirements"].get(
            key,
            None if key == "max_slope_pct" else False,
        )

    return row
