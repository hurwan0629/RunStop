import math
import unittest

from src.algo.routing.waypoints import ellipse_waypoints, P2P_ANGLES
from src.algo.routing.course import generate_course, generate_course_via
from src.algo.routing.candidates import generate_candidates
from src.algo.utils.geo import to_5179, to_4326
from src.algo.utils.graph import grid_graph, NodeIndex


class OneWayCandidatesTest(unittest.TestCase):
    def test_six_points_keep_original_sides_and_avoid_ellipse_tips(self):
        x, y = to_5179.transform(127.0, 37.5)

        def coordinate(dx):
            lng, lat = to_4326.transform(x + dx, y)
            return lat, lng

        start, end = coordinate(-500), coordinate(500)
        points = ellipse_waypoints(start, end, 3000, angles=P2P_ANGLES)
        original = ellipse_waypoints(start, end, 3000, n=8)
        self.assertEqual(len(set(points)), 6)
        self.assertEqual(points[1], original[2])
        self.assertEqual(points[4], original[6])
        sides = []
        for lat, lng in points:
            px, py = to_5179.transform(lng, lat)
            # 양 끝(±1500m)을 피하고 측면 중심에서 ±20도 범위에 머문다.
            self.assertLess(abs(px - x), 520)
            self.assertGreater(abs(py - y), 1300)
            self.assertAlmostEqual(math.hypot(px - x + 500, py - y) + math.hypot(px - x - 500, py - y), 3000, places=4)
            sides.append(py > y)
        self.assertEqual(sides.count(True), 3)

    def test_grid_routes_have_more_than_two_variants_and_keep_endpoints(self):
        graph = grid_graph(45, 45, 100)
        index = NodeIndex(graph)

        def coordinate(node):
            return graph.nodes[node]["y"], graph.nodes[node]["x"]

        start, end = coordinate((22, 17)), coordinate((22, 27))
        via = coordinate((22, 20))
        for with_via in (False, True):
            variants = []
            for bearing in range(0, 360, 60):
                route = (generate_course_via(graph, index, "point_to_point", start, [via], 3000, end=end, bearing=bearing)
                         if with_via else generate_course(graph, index, "point_to_point", start, 3000, end=end, bearing=bearing))
                self.assertEqual(route["nodes"][0], (22, 17))
                self.assertEqual(route["nodes"][-1], (22, 27))
                self.assertLessEqual(route["distance_error_pct"], 10)
                if with_via:
                    self.assertIn((22, 20), route["nodes"])
                variants.append(tuple(route["nodes"]))
            self.assertGreater(len(set(variants)), 2)

        candidates = generate_candidates(graph, index, "point_to_point", start, 3000, end=end)
        self.assertGreater(len(candidates), 2)
        self.assertLessEqual(len(candidates), 6)


if __name__ == "__main__":
    unittest.main()
