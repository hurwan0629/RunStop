import json
import pandas as pd
from ai.src.dataset.schema import validate_dataset
from ai.src.experiment.artifacts import sha256_file


def load_dataset(path, metadata_path):
    metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
    if metadata.get("schema_version") != 1 or metadata.get("status") != "complete":
        raise ValueError("Dataset metadata must describe a complete schema_version=1 snapshot")
    actual_hash = sha256_file(path)
    if metadata.get("candidates_sha256") != actual_hash:
        raise ValueError("Dataset hash differs from metadata; create a new version instead of modifying a snapshot")
    from ai.src.config.schema import UtilityConfig
    utility = UtilityConfig.model_validate(metadata["utility"])
    frame = validate_dataset(pd.read_parquet(path), utility.relevance_levels)
    return frame, metadata, actual_hash
