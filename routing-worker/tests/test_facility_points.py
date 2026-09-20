import json
from copy import deepcopy
import unittest
from unittest.mock import patch

import pandas as pd

from src.algo.features import facilities
from src.algo.ai.feature_adapter import build_ai_feature_rows
from src.algo.utils.geo import to_5179, to_4326
from src.dto.parser import parse_python_recommendation_to_node_require


class FacilityPointsTest(unittest.TestCase):
    def test_markers_match_counts_and_survive_response_serialization(self):
        x, y = to_5179.transform(127.0, 37.5)

        def coordinate(dx, dy):
            lng, lat = to_4326.transform(x + dx, y + dy)
            return lat, lng

        route = [coordinate(0, 0), coordinate(100, 0)]
        rows = [
            ("화장실", "가까운 화장실", *coordinate(25, 49)),
            ("화장실", "먼 화장실", *coordinate(25, 51)),
            ("편의점", None, *coordinate(75, 10)),
            # Bounding box 안이지만 둥근 경로 버퍼 밖인 시설은 제외한다.
            ("편의점", "모서리 밖", *coordinate(-40, -40)),
            ("도시공원", "공원", *coordinate(50, 0)),
            ("가로등", "가로등 1", *coordinate(40, 10)),
            ("보안등", "보안등 1", *coordinate(50, 10)),
            ("CCTV", "CCTV 1", *coordinate(60, 10)),
            ("화장실", "좌표 없음", None, 127.0),
        ]
        frame = pd.DataFrame(rows, columns=["유형", "명칭", "위도", "경도"])
        with (
            patch.object(facilities.pd, "read_csv", return_value=frame) as read_csv,
            patch.dict(facilities._FACILITY_COORDINATES_CACHE, clear=True),
            patch.dict(facilities._FACILITY_POINTS_CACHE, clear=True),
            patch("src.dto.parser.build_map_layers", return_value={"slopeSegments": []}),
        ):
            metrics = facilities.analyze_nearby_facilities(route)
            points = facilities.get_nearby_facility_points(route)
            self.assertEqual(len(points), 5)
            self.assertCountEqual(facilities.get_available_night_facility_types(), facilities.NIGHT_FACILITY_KEYS)
            for key in facilities.FACILITY_STATUS_KEYS + facilities.NIGHT_FACILITY_KEYS:
                self.assertEqual(sum(p["type"] == key for p in points), metrics[f"{key}_count"])
            self.assertEqual(next(p["name"] for p in points if p["type"] == "store"), "편의점")

            candidate = {
                "coords": route,
                "actual_distance_m": 100,
                "condition_score": 80,
                "sub_scores": {},
                "facilities": metrics,
                "nature": {"park_ratio": 0.2, "water_ratio": 0.0, "park_names": ["공원"]},
            }
            original = deepcopy(candidate)
            ai_before = build_ai_feature_rows([candidate], None, None, None)
            response = parse_python_recommendation_to_node_require([candidate])

            # 응답용 마커·구간을 추가해도 원본 후보와 AI 입력은 바뀌지 않는다.
            self.assertEqual(candidate, original)
            self.assertEqual(build_ai_feature_rows([candidate], None, None, None), ai_before)
            serialized = json.loads(json.dumps(response, allow_nan=False))
            self.assertEqual(serialized[0]["featureValues"]["facilityPoints"], points)
            empty_route = [coordinate(1000, 1000), coordinate(1100, 1000)]
            self.assertEqual(facilities.get_nearby_facility_points(empty_route), [])
            read_csv.assert_called_once()


if __name__ == "__main__":
    unittest.main()
