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
    # [2026-09-15 08:51:50] 기준 v1만을 허용시켜줍니다.
    # v1은 데이터를 생성하는 시점 (scripts/generate_datasets.py)에 사용된 config.yaml에 사용된 스키마번호를 의미합니다.
    path = Path(path)
    metadata_path = Path(metadata_path)
    # 메타데이터를 그대로 읽어주기
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    # 메타데이터를 읽어서 실제로 데이터 생성이 끝난 파일이 맞는지 확인해줍니다.
    if metadata.get("schema_version") != 1 or metadata.get("status") != "complete":
        raise ValueError("Dataset metadata must describe a complete schema_version=1 snapshot")

    # parquet 파일이 metadata에 기록된 해시와 같은지 확인합니다.
    # 이는 생성된 parquet 파일 자체를 sha256 방식으로 해싱하여 비교할 수 있습니다.
    actual_hash = sha256_file(path)
    if metadata.get("candidates_sha256") != actual_hash:
        raise ValueError("Dataset hash differs from metadata; create a new version instead of modifying a snapshot")

    # utility 설정으로 relevance 범위를 복원한 뒤 데이터 스키마를 검증합니다.
    from ai.src.config.schema import UtilityConfig
    # Utility에 포함되는 스키마 형태인지를 확인합니다. (utility 점수를 만드는 방식이 정의되어있음)
    utility = UtilityConfig.model_validate(metadata["utility"])
    # candidates.parquet 를 읽어서 DataFrame 형태로 변환합니다.
    # utility를 나누는 점수 범위가 schema version (2026-09-15 10:40:21 기준 v1) 에 부합하는지 확인
    frame = validate_dataset(pd.read_parquet(path), utility.relevance_levels)

    # 만들어진 학습용 DF, 데이터셋 메타정보(metadata.json), parquet sha256 해시
    return frame, metadata, actual_hash
