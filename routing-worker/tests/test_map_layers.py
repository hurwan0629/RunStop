import json
import unittest
from unittest.mock import patch

import geopandas as gpd
from shapely.geometry import box

from src.algo.features import map_layers, nature
from src.algo.utils.geo import CRS_METRIC, to_5179, to_4326


class MapLayersTest(unittest.TestCase):
    def setUp(self):
        self.x, self.y = to_5179.transform(127.0, 37.5)

    def coordinate(self, dx, dy):
        lng, lat = to_4326.transform(self.x + dx, self.y + dy)
        return lat, lng

    def test_slope_keeps_curved_path_indices_and_unknown_elevation(self):
        route = [self.coordinate(0, 0), self.coordinate(10, 10),
                 self.coordinate(20, 0), self.coordinate(30, 10), self.coordinate(100, 10)]
        with (
            patch.object(map_layers, "get_elevation", side_effect=[10.0, 13.0, None]),
            patch.object(map_layers, "_load_nature_layers", return_value={}),
            patch.object(map_layers, "get_available_night_facility_types", return_value=[]),
        ):
            layers = map_layers.build_map_layers(route)

        first, second = layers["slopeSegments"]
        self.assertEqual((first["fromIndex"], first["toIndex"]), (0, 3))
        self.assertGreater(first["slopePct"], 9)
        self.assertEqual((second["fromIndex"], second["toIndex"]), (3, 4))
        self.assertIsNone(second["slopePct"])
        self.assertEqual(layers["availability"], {"slope": True, "park": False, "water": False})
        json.dumps(layers, allow_nan=False)

    def test_nature_clips_long_edge_and_distinguishes_missing_data(self):
        route = [self.coordinate(0, 0), self.coordinate(1000, 0)]
        park = gpd.GeoDataFrame(geometry=[box(self.x + 400, self.y - 10, self.x + 600, self.y + 10)], crs=CRS_METRIC)
        water = gpd.GeoDataFrame(geometry=[box(self.x, self.y + 100, self.x + 1000, self.y + 200)], crs=CRS_METRIC)
        with (
            patch.object(map_layers, "get_elevation", return_value=float("nan")),
            patch.object(map_layers, "_load_nature_layers", return_value={"park": park, "water": water}),
            patch.object(map_layers, "get_available_night_facility_types", return_value=["security"]),
            patch.object(nature, "_load_nature_layers", return_value={"park": park, "water": water}),
        ):
            layers = map_layers.build_map_layers(route)
            # 이름 컬럼이 없는 공간 데이터에서도 기존 숫자 feature 계산이 가능하다.
            self.assertEqual(nature.analyze_nature_adjacency(route)["park_names"], [])

        self.assertEqual(layers["availability"], {"slope": False, "park": True, "water": True})
        self.assertEqual(layers["nightFacilityTypes"], ["security"])
        self.assertEqual(len(layers["natureSegments"]), 1)
        segment = layers["natureSegments"][0]
        self.assertEqual(segment["type"], "park")
        xs = [to_5179.transform(p["lng"], p["lat"])[0] - self.x for p in segment["path"]]
        self.assertAlmostEqual(min(xs), 350, places=2)
        self.assertAlmostEqual(max(xs), 650, places=2)
        json.dumps(layers, allow_nan=False)


if __name__ == "__main__":
    unittest.main()
