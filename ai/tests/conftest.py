from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def candidates():
    rows = []
    # Variable-sized candidate groups; 8 users x 5 requests, no actual routes or source JSON.
    for user in range(8):
        for sequence in range(1, 6):
            count = 6 + (user + sequence) % 5
            for i in range(count):
                utility = round((i + 1) / count, 8)
                rows.append({"user_id": f"u{user}", "request_id": f"u{user}:r{sequence}", "candidate_id": f"c{i:02d}",
                             "request_sequence": sequence, "utility": utility, "ground_truth_rank": count - i,
                             "relevance": min(4, int(utility * 5)), "condition_score": 100 * (1 - utility),
                             "candidate_actual_distance_m": 1000 + 1000 * utility, "candidate_slope_avg_slope_pct": 10 * (1 - utility),
                             "candidate_nature_park_ratio": np.nan if i % 2 else utility,
                             "request_target_distance_m": 2000.0, "user_weight_distance": float(user % 5 + 1),
                             "requirements_max_slope_pct": None})
    return pd.DataFrame(rows)
