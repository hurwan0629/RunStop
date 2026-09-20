import unittest
from unittest.mock import patch

import networkx as nx
import numpy as np

from src.algo import config, pipeline
from src.algo.ai.feature_adapter import build_ai_feature_rows
from src.algo.ai.candidate_selector import select_candidates_with_ai
from src.algo.features.elevation import prepare_graph_elevation
from src.algo.routing.candidates import generate_candidates, generate_candidates_via
from src.algo.routing.shortest_path import shortest_path
from src.algo.scoring.weighting import compute_sub_scores
from src.algo.utils.graph import grid_graph, NodeIndex
from src.algo.utils.geo import to_5179
from src.dto.recommend import RouteRecommendRequestDTO
from src.dto.parser import parse_node_request_to_python_recommendation


class PreferencesTest(unittest.TestCase):
    def test_flow_and_actual_nature_nodes_change_path_before_feature_scoring(self):
        graph = nx.MultiDiGraph()
        for a, b in [(0, 1), (1, 3), (0, 2), (2, 3)]:
            graph.add_edge(a, b, length=100)
        graph.nodes[1]["highway"] = "traffic_signals"
        self.assertEqual(shortest_path(graph, 0, 3, weights={"flow": 5})[0], [0, 2, 3])
        self.assertEqual(shortest_path(graph, 0, 3, weights={"flow": 0, "nature": 5},
                                      requirements={"_nature_nodes": {1}})[0], [0, 1, 3])
        candidate = {"actual_distance_m": 1000, "distance_error_pct": 0, "surface": {"signal_per_km": 0, "crossing_per_km": 1}}
        self.assertLess(compute_sub_scores(candidate)["flow"], 100)

    def test_measured_slope_limit_is_checked_before_ai_selection(self):
        candidates = [{"coords": [(0, 0), (0, .01)], "nodes": [0, 1], "actual_distance_m": 1000,
                       "distance_error_pct": 0, "overlap_ratio": 0, "mode": "loop"} for _ in range(2)]
        with (
            patch("src.algo.features.elevation.prepare_graph_elevation"),
            patch.object(pipeline, "generate_candidates", return_value=candidates) as generate,
            patch.object(pipeline, "analyze_elevation_profile", side_effect=[{"max_slope_pct": 6}, {"max_slope_pct": 4}]),
            patch.object(pipeline, "analyze_nearby_facilities", return_value={}),
            patch.object(pipeline, "analyze_nature_adjacency", return_value={}),
            patch.object(pipeline, "analyze_surface_profile", return_value={}),
            patch.object(pipeline, "select_candidates_with_ai", side_effect=lambda values, *a, **kw: values) as select,
        ):
            result = pipeline.recommend(nx.MultiDiGraph(), None, "LOOP", (0, 0), 1,
                                        requirements={"max_slope_pct": 5}, facility_preferences={"toilet": "PREFER"})
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["slope"]["max_slope_pct"], 4)
        self.assertEqual(generate.call_args.kwargs["facility_preferences"], {"toilet": "PREFER"})
        self.assertEqual(len(select.call_args.args[0]), 1)

    def test_dem_is_used_before_routing_and_missing_values_are_not_flat(self):
        graph = nx.MultiDiGraph()
        graph.add_node(0, y=0, x=0)
        graph.add_node(1, y=1, x=0)
        graph.add_node(2, y=2, x=0)
        graph.add_edge(0, 1, length=100)
        graph.add_edge(1, 2, length=100)
        with patch("src.algo.features.elevation.get_elevation", side_effect=[0, 5, None]) as dem:
            prepare_graph_elevation(graph)
            prepare_graph_elevation(graph)
            self.assertEqual(dem.call_count, 3)
        self.assertEqual(graph[0][1][0]["routing_slope_pct"], 5)
        self.assertNotIn("routing_slope_pct", graph[1][2][0])

    def test_gentle_and_rolling_choose_different_paths_before_scoring(self):
        graph = nx.MultiDiGraph()
        # 동일 거리의 평지와 5% 오르내림. UI 선택이 실제 탐색 경로를 바꿔야 한다.
        for a, b, slope in [(0, 1, 0), (1, 3, 0), (0, 2, 5), (2, 3, 5)]:
            graph.add_edge(a, b, length=100, routing_slope_pct=slope)
        weights = {"elevation": 5, "nature": 0, "night": 0, "flow": 0}
        gentle, _ = shortest_path(graph, 0, 3, weights=weights, requirements={"max_slope_pct": 5, "slope_preference": "GENTLE"})
        rolling, _ = shortest_path(graph, 0, 3, weights=weights, requirements={"max_slope_pct": 8, "slope_preference": "NORMAL"})
        self.assertEqual(gentle, [0, 1, 3])
        self.assertEqual(rolling, [0, 2, 3])
        graph[0][2][0]["routing_slope_pct"] = 12
        self.assertEqual(shortest_path(graph, 0, 3, weights=weights, requirements={"max_slope_pct": 8, "slope_preference": "NORMAL"})[0], [0, 1, 3])

    def test_facility_preference_changes_pool_and_preserves_user_via_and_mode(self):
        graph = grid_graph(35, 35, 100)
        index = NodeIndex(graph)
        coordinate = lambda node: (graph.nodes[node]["y"], graph.nodes[node]["x"])
        start, via = coordinate((17, 17)), coordinate((17, 20))
        facility = coordinate((22, 22))
        facilities = {"화장실": np.array([to_5179.transform(facility[1], facility[0])])}
        with patch("src.algo.routing.guidance._load_facility_coordinates", return_value=facilities):
            baseline = generate_candidates(graph, index, "loop", start, 3000, facility_preferences={"toilet": "IGNORE"})
            preferred = generate_candidates(graph, index, "loop", start, 3000, facility_preferences={"toilet": "PREFER"})
            guided = [c for c in preferred if c.get("generation_source", "").startswith("guided:")]
            self.assertTrue(guided)
            self.assertTrue(any((22, 22) in c["nodes"] for c in guided))
            self.assertNotEqual([c["nodes"] for c in baseline], [c["nodes"] for c in preferred])
            for mode in ("loop", "out_and_back", "point_to_point"):
                candidates = generate_candidates_via(graph, index, mode, start, 3000,
                    coordinate((17, 25)) if mode == "point_to_point" else None, [via], 6,
                    facility_preferences={"toilet": "PREFER"})
                self.assertTrue(candidates)
                for candidate in candidates:
                    self.assertIn((17, 20), candidate["nodes"])
                    self.assertEqual(candidate["mode"], mode)
                    self.assertEqual(candidate["user_via_count"], 1)
                    self.assertLessEqual(candidate["distance_error_pct"], config.CAND_DIST_TOL_PCT)
                    if mode == "out_and_back":
                        self.assertEqual(candidate["nodes"], candidate["nodes"][::-1])
                    else:
                        self.assertLessEqual(candidate["overlap_ratio"], config.CAND_MAX_OVERLAP)
                    row = build_ai_feature_rows([candidate], {}, {}, {})[0]
                    self.assertEqual(row["request_via_count"], 1)
                    self.assertEqual(row["request_type_round_trip"], float(mode == "out_and_back"))

    def test_worker_contract_keeps_slope_intent_and_applied_fallback_separate(self):
        request = RouteRecommendRequestDTO.model_validate({
            "routeType": "LOOP", "startPoint": {"lat": 37.5, "lng": 127},
            "elementConditions": {"targetDistance": 3000, "maxSlope": 12, "slopePreference": "NORMAL",
                "weights": {"flow": 0}, "facilityPreferences": {"toilet": "PREFER", "store": "IGNORE"}},
        })
        parsed = parse_node_request_to_python_recommendation(request)
        self.assertEqual(parsed["requirements"], {"max_slope_pct": 12, "slope_preference": "NORMAL"})
        self.assertEqual(parsed["weights"]["flow"], 0)
        self.assertEqual(parsed["facility_preferences"]["toilet"], "PREFER")

    def test_ai_score_and_fallback_are_explicit_without_changing_heuristic_score(self):
        candidates = [{"condition_score": 90}, {"condition_score": 10}]
        with patch("src.algo.ai.candidate_selector.score_candidates_with_artifact", return_value=[0.2, 0.8]):
            self.assertIs(select_candidates_with_ai(candidates, {}, {}, {}, 1)[0], candidates[1])
        self.assertEqual(candidates[1]["condition_score"], 10)
        self.assertEqual(candidates[1]["ai_score"], .8)
        with patch("src.algo.ai.candidate_selector.score_candidates_with_artifact", side_effect=RuntimeError("offline")):
            self.assertIs(select_candidates_with_ai(candidates, {}, {}, {}, 1)[0], candidates[0])
        self.assertEqual(candidates[0]["ranking_source"], "condition_score")
        self.assertIsNone(candidates[0]["ai_score"])


if __name__ == "__main__":
    unittest.main()
