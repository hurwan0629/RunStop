import numpy as np
import pandas as pd
from ai.src.dataset.schema import CANDIDATE_COLUMNS


def select_feature_columns(df, config):
    prefixes = []
    if config.use_profile:
        prefixes.append("user_weight_")
    if config.use_request:
        prefixes.extend(["request_weight_", "request_target_", "request_type_", "request_via_"])
    if config.use_requirements:
        prefixes.append("requirements_")
    columns = sorted(c for c in df if c.startswith(tuple(prefixes)) and c != "candidate_id")
    if config.use_candidate_features:
        columns = sorted(set(columns) | (set(df) & CANDIDATE_COLUMNS))
    if config.use_condition_score:
        columns.append("condition_score")
    if not columns:
        raise ValueError("Select at least one feature group")
    build_model_input(df, columns)
    return columns


def build_model_input(df, columns):
    missing = set(columns) - set(df)
    if missing:
        raise ValueError(f"Missing model inputs: {sorted(missing)}")
    # Fail on strings instead of silently converting corrupt features to missing data.
    frame = df[columns].apply(pd.to_numeric, errors="raise").astype(float)
    if np.isinf(frame.to_numpy()).any():
        raise ValueError("Infinite feature value")
    return frame
