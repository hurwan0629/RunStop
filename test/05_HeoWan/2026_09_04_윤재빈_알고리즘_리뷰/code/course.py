"""
심장 — geo/graph/routing/waypoints 를 엮어 3가지 모드의 코스를 만든다.

세 모드의 차이는 _build() 안의 분기뿐:
  out_and_back  : 경유지 1개, 갔던 길 뒤집기 (벌점 없음)
  loop          : 경유지 1개, 나간 길에 벌점 -> 다른 길로 복귀
  point_to_point: 타원 경유지 1개, S->W->E (약한 벌점)

거리는 한 번에 못 맞추므로, 실제거리를 재고 scale 을 보정해 재시도한다
(오차 5% 이내 또는 6회).
"""

from geo import haversine_m
from routing import shortest_path, edge_set
from waypoints import circle_waypoints, ellipse_waypoints


def _overlap_ratio(nodes):
    """방향 무시, 이미 지난 도로 재방문 비율. 순환 품질 지표."""
    seen, reused, total = set(), 0, 0
    for u, v in zip(nodes[:-1], nodes[1:]):
        e = frozenset((u, v))
        total += 1
        if e in seen:
            reused += 1
        else:
            seen.add(e)
    return reused / total if total else 0.0


def _build(G, idx, mode, start, end, scale, bearing):
    s = idx.snap(*start)

    # 왕복의 경우에는 시작점을 기준으로 target_distance_m/2 를 반지름으로 하는 원에서맨 첫번쨰를 선택하여 
    # 경로를 만들어 반환해줍니다.
    if mode == "out_and_back":
        w = circle_waypoints(*start, radius_m=scale, n=1, start_bearing=bearing)[0]
        wn = idx.snap(*w)
        out, out_len = shortest_path(G, s, wn)
        return out + out[-2::-1], out_len * 2

    # 원형의 경우에는 반지름거리의 한 점을 잡아서 겹치지 않게 만들어줍니다.
    # 
    if mode == "loop":
        w = circle_waypoints(*start, radius_m=scale, n=1, start_bearing=bearing)[0]
        wn = idx.snap(*w)
        out, out_len = shortest_path(G, s, wn)
        back, back_len = shortest_path(G, wn, s, penalty_edges=edge_set(out), factor=5.0)
        return out + back[1:], out_len + back_len

    # 지점간 연결의 경우에는 끝 지점을 잡아서 타원 공식을 이용하여 길을 생성해줍니다.
    # 해당 함수가 쓰이는 부분은 vias(사용자 지정 경유지)가 없기 때문에 깔끔한 총 거리를 구하기 위해
    # 타원 공식을 이용합니다.
    if mode == "point_to_point":
        e = idx.snap(*end)
        ws = ellipse_waypoints(start, end, target_sum_m=scale, n=8)
        w = ws[int(round(bearing / 45.0)) % 8]
        wn = idx.snap(*w)
        # FP_1
        a, a_len = shortest_path(G, s, wn)
        # FP_2
        b, b_len = shortest_path(G, wn, e, penalty_edges=edge_set(a), factor=2.0)
        return a + b[1:], a_len + b_len

    raise ValueError(f"unknown mode: {mode}")


def generate_course(G, idx, mode, start, target_distance_m, end=None,
                    bearing=0.0, max_iter=6, tol=0.05):
    # 
    if mode == "point_to_point" and end is None:
        raise ValueError("point_to_point 모드는 end 좌표가 필요합니다")

    # 다시 돌아오는 방식의 경우에는 기본 scale를 목표 거리의 걸반으로 설정해줍ㄴ디ㅏ.
    scale = target_distance_m / 2 if mode in ("loop", "out_and_back") else target_distance_m

    best = None
    for _ in range(max_iter):
        # mode에는 총 loop, out_and_back, point_to_point가 존재합니다.
        nodes, dist = _build(G, idx, mode, start, end, scale, bearing)
        if dist <= 0:
            scale *= 2
            continue
        err = abs(dist - target_distance_m) / target_distance_m
        if best is None or err < best[0]:
            best = (err, nodes, dist, scale)
        if err <= tol:
            break
        scale *= target_distance_m / dist       # 스케일 피드백 보정

    if best is None:
      raise ValueError("유효한 경로를 생성하지 못했습니다.")

    err, nodes, dist, scale = best 
    return _pack(mode, nodes, dist, target_distance_m, G, round(scale))


def _pack(mode, nodes, dist, target_m, G, scale_m):
    """course 결과 dict. generate_course / generate_course_via 공통.
    nodes: OSM 엣지 속성(노면·계단·신호등)을 읽으려면 노드 경로가 필요해 함께 넘긴다."""
    err = abs(dist - target_m) / target_m
    return {
        # via, point_to_point, out_and_back, loop 방식중 하나.
        # 경유지를 입력받은 경우는 모두 via가 됨.
        "mode": mode,
        # 사용자가 원하는 거리
        "target_distance_m": target_m,
        # 실제로 나온 거리
        "actual_distance_m": round(dist),
        # 오차율 %
        "distance_error_pct": round(err * 100, 1),
        # 총 edge 개수중에 덮어씌워진 개수의 비율을 소수점 3자리까지
        "overlap_ratio": round(_overlap_ratio(nodes), 3),
        # ??? 이거 뭐임
        "scale_m": scale_m,
        # 지나가는 모든 coord 배열
        "coords": [(G.nodes[n]["y"], G.nodes[n]["x"]) for n in nodes],
        # 순수 idx 배열
        "nodes": nodes,
    }


def _route_chain(G, node_chain, penalty=3.0):
    """연속한 노드쌍을 최단경로로 잇되, 앞 구간에서 쓴 엣지엔 벌점 (왕복 억제).
    반환: (전체 노드열, 총 길이 m)."""
    # 기본 값을 
    # full: 최종 경로
    # total: 총 거리
    # used: 이미 사용된 경로 집합
    full, total, used = [], 0.0, set()
    # (0, 1), (1, 2), ... (n-1, n) 순회
    for a, b in zip(node_chain[:-1], node_chain[1:]):
        # list[node_id]와 그 거리의 합을 반환받음.
        seg, seg_len = shortest_path(G, a, b, penalty_edges=used, factor=penalty)
        used |= edge_set(seg) # 모든 edge를 frozenset((u, v)) 형태로 만들어서 집합에 합쳐주기
        # 
        full = seg if not full else full + seg[1:]
        total += seg_len
    return full, total


def generate_course_via(G, idx, start, vias, target_distance_m, end=None,
                        bearing=0.0, max_iter=6, tol=0.05, penalty=3.0):
    """사용자가 지정한 경유지(vias, 순서대로 반드시 통과)를 지나는 코스.
    end=None 이면 시작점으로 복귀(순환). 목표거리에 모자라면 마지막 구간에
    우회점 하나를 끼워 채운다."""
    # 목표 지점이 존재하지 않으면 tail을 end 와 동일한 위치로 설정시켜주기
    tail = end if end is not None else start
    # 기본으로 지나가는 경로들을 잡아주기
    anchors = [start] + list(vias) + [tail]
    # list[tuple[float, float]] -> list[nodeIdx]
    anchor_nodes = [idx.snap(*a) for a in anchors]


    fixed_nodes, fixed_len = _route_chain(G, anchor_nodes, penalty)
    if fixed_len > target_distance_m * (1 + tol):
        raise ValueError(
            f"경유지를 다 지나면 최소 {fixed_len/1000:.2f}km 라서 "
            f"목표 {target_distance_m/1000:.2f}km 보다 깁니다"
        )
    if fixed_len >= target_distance_m * (1 - tol):
        return _pack("via", fixed_nodes, fixed_len, target_distance_m, G,
                     scale_m=round(fixed_len))

    # 마지막 구간(마지막 경유지 -> tail)에 우회점 P 하나 끼워 부족분 채우기
    a_last, b_last = anchors[-2], anchors[-1]
    # 타원을 통해 구할 거리를 잡아줌. PF_1 <-> F_2P 거리합
    scale = haversine_m(a_last, b_last) + (target_distance_m - fixed_len)  # 타원 target_sum 초기값

    best = None
    # max_iter만큼 타원 크기를 조절 가능
    for _ in range(max_iter):
        try:
            # 타원 크기(scale)를 조절해가며 타원 위의 포인트 후보들을 잡아주기
            cand_pts = ellipse_waypoints(a_last, b_last, target_sum_m=scale, n=8)
        # 두 점 사이의 거리(start~end)가 target_sum_m보다 길면 에러
        except ValueError:
            # 한번 조정해주기
            scale *= 1.1
            continue
        # 요청받은 각도와 가장 유사한 방향의 타원 위 점을 선택합니다.
        pn = idx.snap(*cand_pts[int(round(bearing / 45.0)) % 8])
        # 타원 위의 점을 이용하여 [..., -2, -1, pn, 0] 형태의 경로를 생성해줍ㄴ디ㅏ.
        nodes, length = _route_chain(G, anchor_nodes[:-1] + [pn, anchor_nodes[-1]], penalty)
        # 경로가 생성되지 않으면 타원을 키워서 시도해보기
        # 보통 경로가 음수가 나오지는 않고
        # 0이 되는 경우는 idx.snap()을 할 때 두 위경도가 같은 노드로 이어질 경우에 
        # 해당 에러가 발생할 수 있음. 그럴 때에는 과감하게 2배로 키우기
        if length <= 0:
            scale *= 2
            continue
        # 오차율 구하기 (총 거리에 대한 오차 미터)
        err = abs(length - target_distance_m) / target_distance_m
        # 업데이트 시도
        if best is None or err < best[0]:
            best = (err, nodes, length, scale)
        if err <= tol:
            break
        # 다음 시도때 조금 더 적절한 경로를 선택하기 위해 
        # 타원 크기를 키워주거나 좁혀줌
        scale *= target_distance_m / length

    # 뭘 해도 경로 생성을 할 수 없었다면 반환
    if best is None:
      raise ValueError("유효한 경로를 생성하지 못했습니다.")

    err, nodes, length, scale = best
    # dict 형태로 데이터를 만들어 반환
    return _pack("via", nodes, length, target_distance_m, G, scale_m=round(scale))


if __name__ == "__main__":
    from graph import grid_graph, NodeIndex

    G = grid_graph(60, 60, 100)
    idx = NodeIndex(G)
    start = (G.nodes[(30, 30)]["y"], G.nodes[(30, 30)]["x"])
    end = (G.nodes[(30, 40)]["y"], G.nodes[(30, 40)]["x"])
    via = (G.nodes[(45, 30)]["y"], G.nodes[(45, 30)]["x"])

    for mode in ("out_and_back", "loop"):
        r = generate_course(G, idx, mode, start, 3000, bearing=0.0)
        print(mode, "->", r["actual_distance_m"], "m  err", r["distance_error_pct"],
              "%  overlap", r["overlap_ratio"])
    r = generate_course(G, idx, "point_to_point", start, 3000, end=end, bearing=90.0)
    print("point_to_point ->", r["actual_distance_m"], "m  err", r["distance_error_pct"], "%")

    r = generate_course_via(G, idx, start, [via], 4000, bearing=90.0)
    print("via (순환, 경유지 1개) ->", r["actual_distance_m"], "m  err",
          r["distance_error_pct"], "%  overlap", r["overlap_ratio"])
