"""학습에 사용할 feature 컬럼을 고르고 숫자 입력 행렬로 변환합니다."""
from collections.abc import Sequence
import numpy as np
import pandas as pd
from ai.src.config.schema import FeatureConfig
from ai.src.dataset.schema import CANDIDATE_COLUMNS


def select_feature_columns(df: pd.DataFrame, config: FeatureConfig) -> list[str]:
    """설정값에 따라 모델 입력으로 사용할 컬럼 목록을 선택합니다."""
    prefixes = []

    # 사용자 프로필, 요청값, 요구조건 중 켜진 그룹만 후보 prefix로 모읍니다.
    if config.use_profile:
        prefixes.append("user_weight_")
    if config.use_request:
        prefixes.extend(["request_weight_", "request_target_", "request_type_", "request_via_"])
    if config.use_requirements:
        prefixes.append("requirements_")

    # prefix 기반 context feature와 후보 경로 feature를 합칩니다.
    columns = sorted(c for c in df if c.startswith(tuple(prefixes)) and c != "candidate_id")
    if config.use_candidate_features:
        columns = sorted(set(columns) | (set(df) & CANDIDATE_COLUMNS))
    if config.use_condition_score:
        columns.append("condition_score")
    if not columns:
        raise ValueError("Select at least one feature group")

    # 실제 변환을 한 번 실행해 컬럼 누락과 타입 문제를 조기에 잡습니다.
    build_model_input(df, columns)
    return columns


def build_model_input(df: pd.DataFrame, columns: Sequence[str]) -> pd.DataFrame:
    """선택된 컬럼을 모델이 받을 수 있는 float DataFrame으로 변환합니다."""
    # 실제로 존재할 수 있는 컬럼에 대해서 df에 존재하지 않는 것을 발견하면 에러를 냅니다
    missing = set(columns) - set(df)
    if missing:
        raise ValueError(f"Missing model inputs: {sorted(missing)}")

    # 문자열이나 깨진 값을 결측치로 숨기지 않고 바로 실패시킵니다.
    frame = df[columns].apply(pd.to_numeric, errors="raise").astype(float)
    if np.isinf(frame.to_numpy()).any():
        raise ValueError("Infinite feature value")
    return frame
