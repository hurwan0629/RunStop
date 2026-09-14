"""저장된 후보 데이터셋과 metadata를 함께 검증해서 로드합니다."""
import json
from pathlib import Path
from typing import Any
import pandas as pd
from ai.src.dataset.schema import validate_dataset
from ai.src.experiment.artifacts import sha256_file


def load_dataset(path: str | Path, metadata_path: str | Path) -> tuple[pd.DataFrame, dict[str, Any], str]:
    """metadata와 해시가 일치하는 완료된 schema v1 데이터셋만 읽습니다."""
    # metadata가 완료된 v1 스냅샷인지 먼저 확인합니다.
    path = Path(path)
    metadata_path = Path(metadata_path)
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("schema_version") != 1 or metadata.get("status") != "complete":
        raise ValueError("Dataset metadata must describe a complete schema_version=1 snapshot")

    # parquet 파일이 metadata에 기록된 해시와 같은지 확인합니다.
    actual_hash = sha256_file(path)
    if metadata.get("candidates_sha256") != actual_hash:
        raise ValueError("Dataset hash differs from metadata; create a new version instead of modifying a snapshot")

    # utility 설정으로 relevance 범위를 복원한 뒤 데이터 스키마를 검증합니다.
    from ai.src.config.schema import UtilityConfig
    utility = UtilityConfig.model_validate(metadata["utility"])
    frame = validate_dataset(pd.read_parquet(path), utility.relevance_levels)
    return frame, metadata, actual_hash
