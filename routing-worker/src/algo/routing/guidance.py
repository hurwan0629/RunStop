"""사용자 선호가 있는 실제 도로 노드를 내부 경유 기준점으로 고른다."""
import numpy as np
from scipy.spatial import cKDTree
from shapely import Point, contains_xy

from src.algo import config
from src.algo.features.facilities import _load_facility_coordinates, FACILITY_TYPE_TO_KEY, NIGHT_FACILITY_KEYS
from src.algo.features.nature import _load_nature_layers
from src.algo.scoring.constraints import extract_slope_pct
from src.algo.utils.geo import haversine_m, to_5179


def guided_anchors(graph, index, mode, start, target_m, end, vias, weights, requirements, preferences, limit):
    """시설/자연 geometry 주변의 도로 노드 중 방향이 다른 기준점을 제한된 수만 선택."""
    weights, preferences = weights or {}, preferences or {}
    requirements = requirements if requirements is not None else {}
    facility_keys = [key for key in ("toilet", "store") if preferences.get(key) == "PREFER"]
    nature_weight = weights.get("nature", weights.get("park", 0)) / 5
    night_weight = max(weights.get("night", weights.get("safety", 1)) - 1, 0) / 4
    rolling = requirements.get("slope_preference") == "NORMAL"
    if not (facility_keys or nature_weight or night_weight or rolling) or limit <= 0:
        return []

    node_ids, xy = index.nearby(start, target_m)
    if not len(node_ids):
        return []
    coordinates = [(graph.nodes[node]["y"], graph.nodes[node]["x"]) for node in node_ids]
    last = vias[-1] if vias else start
    prefix = sum(haversine_m(a, b) for a, b in zip([start] + list(vias), vias))
    tail = end if mode == "point_to_point" else start
    # 직선거리 하한으로 범위를 줄이고, 실제 도달성·거리는 기존 경로 생성에서 검사한다.
    lower_bounds = np.array([
        2 * (prefix + haversine_m(last, point)) if mode == "out_and_back"
        else prefix + haversine_m(last, point) + haversine_m(point, tail)
        for point in coordinates
    ])
    allowed = lower_bounds <= target_m * (1 + config.DIST_FIT_TOL)
    scores = np.zeros(len(node_ids))
    sources = []
    local_tree = cKDTree(xy)

    # 시설 데이터는 한 번 캐시하고 요청 주변만 조회한다. edge 탐색 중 CSV 조회는 없다.
    requested = {key: 1.0 for key in facility_keys}
    requested.update({key: night_weight for key in NIGHT_FACILITY_KEYS if night_weight})
    if requested:
        for facility_type, points in _load_facility_coordinates().items():
            key = FACILITY_TYPE_TO_KEY.get(facility_type)
            if key not in requested:
                continue
            bounds_min, bounds_max = xy.min(axis=0) - config.FACILITY_BUFFER_M, xy.max(axis=0) + config.FACILITY_BUFFER_M
            nearby = points[np.all((points >= bounds_min) & (points <= bounds_max), axis=1)]
            counts = np.zeros(len(node_ids))
            for matches in local_tree.query_ball_point(nearby, config.FACILITY_BUFFER_M):
                counts[matches] += 1
            if counts.max() > 0:
                scores += requested[key] * counts / counts.max()
                sources.append(key)

    if nature_weight:
        nature_nodes = set()
        search_area = Point(*to_5179.transform(start[1], start[0])).buffer(target_m)
        for key, layer in _load_nature_layers().items():
            if layer is None:
                continue
            matches = list(layer.sindex.query(search_area, predicate="intersects"))
            if matches:
                geometry = layer.geometry.iloc[matches].union_all().buffer(config.NATURE_BUFFER_M)
                values = contains_xy(geometry, xy[:, 0], xy[:, 1])
                scores += nature_weight * values
                nature_nodes.update(node_ids[i] for i in np.flatnonzero(values))
                if values.any():
                    sources.append(key)
        if any(layer is not None for layer in _load_nature_layers().values()):
            requirements["_nature_nodes"] = nature_nodes

    if rolling:
        target = config.ROLLING_TARGET_SLOPE_PCT
        for i, node in enumerate(node_ids):
            slopes = [extract_slope_pct(data) for *_, data in graph.edges(node, data=True)]
            valid = [slope for slope in slopes if slope is not None and slope <= requirements.get("max_slope_pct", 8)]
            if valid:
                scores[i] += max(max(0, 1 - abs(slope - target) / target) for slope in valid)
        sources.append("slope")

    # 한 밀집 지역만 선택하지 않도록 방향별 최상위 노드를 먼저 사용한다.
    origin = np.array(to_5179.transform(start[1], start[0]))
    bearings = (np.degrees(np.arctan2(xy[:, 0] - origin[0], xy[:, 1] - origin[1])) + 360) % 360
    order = sorted(np.flatnonzero(allowed & (scores > 0)), key=lambda i: (-scores[i], -lower_bounds[i], i))
    chosen, sectors = [], set()
    for i in order:
        sector = int(bearings[i] / (360 / limit))
        if sector in sectors or np.linalg.norm(xy[i] - origin) < config.FACILITY_BUFFER_M:
            continue
        if any(np.linalg.norm(xy[i] - xy[j]) < 2 * config.FACILITY_BUFFER_M for j in chosen):
            continue
        chosen.append(i)
        sectors.add(sector)
        if len(chosen) >= limit:
            break
    return [(coordinates[i], float(bearings[i]), "+".join(sources)) for i in chosen]
