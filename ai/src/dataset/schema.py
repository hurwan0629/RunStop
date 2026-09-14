"""후보 경로 테이블 v1 스키마입니다. 식별자, 숫자 feature, 고정 label만 허용합니다."""
import numpy as np
import pandas as pd

REQUIRED = {"user_id", "request_id", "candidate_id", "request_sequence", "condition_score", "utility", "ground_truth_rank", "relevance"}
LABELS = {"utility", "ground_truth_rank", "relevance", "selected", "model_score", "model_rank"}
IDENTIFIERS = {"user_id", "request_id", "candidate_id", "request_sequence"}
CANDIDATE_SCALARS = {"actual_distance_m", "target_distance_m", "distance_error_pct", "overlap_ratio", "estimated_minutes", "exact_match"}
CANDIDATE_SECTIONS = {
    "slope": {"avg_slope_pct", "max_slope_pct", "slope_std_pct", "elevation_gain_m", "elevation_loss_m", "sample_count"},
    "nature": {"park_ratio", "water_ratio"},
    "surface": {"length_m", "walkable_ratio", "bigroad_ratio", "stairs_count", "signal_per_km", "crossing_per_km"},
    "facilities": {"route_length_km", "buffer_m"} | {f"{kind}_{metric}" for kind in ("toilet", "store", "park", "light", "security", "walklight", "cctv") for metric in ("count", "per_km", "nearest_m")},
}
CANDIDATE_COLUMNS = {f"candidate_{key}" for key in CANDIDATE_SCALARS} | {
    f"candidate_{section}_{key}" for section, keys in CANDIDATE_SECTIONS.items() for key in keys}


def flatten_candidate(candidate):
    """worker 후보 dict를 학습용 1행 컬럼 구조로 펼칩니다."""
    row = {}

    # 후보 dict의 최상위 숫자값을 candidate_ prefix 컬럼으로 옮깁니다.
    for key in sorted(CANDIDATE_SCALARS):
        row[f"candidate_{key}"] = candidate.get(key)

    # slope/facilities/nature/surface 내부 feature는 명시된 schema만 허용합니다.
    for section in ("slope", "facilities", "nature", "surface"):
        for key, value in candidate.get(section, {}).items():
            if key not in CANDIDATE_SECTIONS[section]:
                raise ValueError(f"Unknown worker feature; update the schema explicitly: {section}.{key}")
            if value is not None and (not isinstance(value, (int, float, bool)) or not np.isfinite(value)):
                raise ValueError(f"Non-numeric feature: {section}.{key}")
            row[f"candidate_{section}_{key}"] = value
    row["condition_score"] = candidate["condition_score"]
    return row


def validate_dataset(df, relevance_levels=5):
    """데이터셋 전체가 학습 가능한 schema v1 형태인지 검증합니다."""
    # 필수 컬럼과 알 수 없는 candidate feature를 먼저 검사합니다.
    missing = REQUIRED - set(df.columns)
    if missing or df.empty:
        raise ValueError(f"Empty dataset or missing columns: {sorted(missing)}")
    unknown = {c for c in df if c.startswith("candidate_")} - CANDIDATE_COLUMNS - {"candidate_id"}
    if unknown:
        raise ValueError(f"Unknown candidate features (possible label leakage): {sorted(unknown)}")

    # 후보 feature는 숫자로 변환 가능해야 하고 무한대 값을 가질 수 없습니다.
    for key in set(df) & CANDIDATE_COLUMNS:
        values = pd.to_numeric(df[key], errors="raise").to_numpy(dtype=float, na_value=np.nan)
        if np.isinf(values).any():
            raise ValueError(f"Infinite candidate feature: {key}")

    # 식별자는 비어 있지 않은 문자열이어야 하며 request 안에서 후보가 중복되면 안 됩니다.
    for key in IDENTIFIERS:
        if df[key].isna().any():
            raise ValueError(f"Null identifier: {key}")
    for key in ("user_id", "request_id", "candidate_id"):
        if not df[key].map(lambda v: isinstance(v, str) and bool(v.strip())).all():
            raise ValueError(f"{key} must contain nonempty strings")
    if df.duplicated(["request_id", "candidate_id"]).any():
        raise ValueError("Duplicate candidate within request")
    if (df.groupby("request_id").size() < 2).any():
        raise ValueError("Each request needs at least two candidates")
    if (df.groupby("request_id")[["user_id", "request_sequence"]].nunique() != 1).any().any():
        raise ValueError("A request must belong to exactly one user and sequence")

    # 사용자 내부 request_sequence는 request_id마다 하나만 존재해야 합니다.
    requests = df[["user_id", "request_id", "request_sequence"]].drop_duplicates()
    if requests.duplicated(["user_id", "request_sequence"]).any():
        raise ValueError("Duplicate request sequence within user")

    # label과 점수 컬럼의 숫자 범위를 검증합니다.
    for key in ("request_sequence", "ground_truth_rank", "relevance", "utility", "condition_score"):
        if not pd.api.types.is_numeric_dtype(df[key]) or not np.isfinite(df[key].to_numpy(dtype=float)).all():
            raise ValueError(f"{key} must contain finite numbers")
    for key in ("request_sequence", "ground_truth_rank", "relevance"):
        if (df[key] % 1 != 0).any() or (df[key] < (0 if key == "relevance" else 1)).any():
            raise ValueError(f"Invalid integer domain: {key}")
    if not df.utility.between(0, 1).all() or not df.relevance.between(0, relevance_levels - 1).all():
        raise ValueError("Utility/relevance out of range")

    # utility 기준 rank/relevance가 생성 규칙과 일치하는지 확인합니다.
    ranks = df.groupby("request_id").utility.rank(method="dense", ascending=False).astype(int)
    if not np.array_equal(ranks.to_numpy(), df.ground_truth_rank.to_numpy()):
        raise ValueError("Ground truth ranks disagree with utility (dense tie ranks required)")
    expected = np.minimum(relevance_levels - 1, (df.utility * relevance_levels).astype(int))
    if not np.array_equal(expected, df.relevance):
        raise ValueError("Relevance disagrees with utility fixed-width bins")

    # 같은 요청의 후보들은 동일한 사용자/요청 context feature를 공유해야 합니다.
    context = [c for c in df if c.startswith(("user_weight_", "request_", "requirements_"))]
    if context and (df.groupby("request_id")[context].nunique(dropna=False) > 1).any().any():
        raise ValueError("User/request features differ between candidates of the same request")
    return df
