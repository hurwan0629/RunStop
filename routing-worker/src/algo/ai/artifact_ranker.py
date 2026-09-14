from __future__ import annotations

import json
import pickle
from functools import lru_cache
from pathlib import Path
from typing import Any

import pandas as pd

from src.algo.ai.feature_adapter import build_ai_feature_rows
from src.algo.types import CandidateRoute, Requirements, Weights


ARTIFACT_DIR = Path(__file__).resolve().parent / "artifact"


class BaseRankingModel:
    def prepare(self, frame: pd.DataFrame) -> Any:
        x = frame[self.columns].apply(pd.to_numeric, errors="raise").astype(float)
        return self.preprocessor.transform(x)

    def check_scores(self, scores: Any, length: int) -> Any:
        import numpy as np

        values = np.asarray(scores, dtype=float)
        if values.shape != (length,) or not np.isfinite(values).all():
            raise ValueError("predict_scores must return one finite score per input row")
        return values


class TreeRanker(BaseRankingModel):
    def predict_scores(self, candidates: pd.DataFrame) -> Any:
        return self.check_scores(self.estimator.predict(self.prepare(candidates)), len(candidates))


class LightGBMRanker(TreeRanker):
    name = "lightgbm_ranker"


class ArtifactUnpickler(pickle.Unpickler):
    def find_class(self, module: str, name: str) -> Any:
        if module == "ai.src.models.base" and name == "BaseRankingModel":
            return BaseRankingModel
        if module == "ai.src.models.base" and name == "TreeRanker":
            return TreeRanker
        if module == "ai.src.models.implementations.lightgbm_ranker" and name == "LightGBMRanker":
            return LightGBMRanker
        return super().find_class(module, name)


@lru_cache(maxsize=1)
def _load_model() -> Any:
    with (ARTIFACT_DIR / "model.pkl").open("rb") as stream:
        return ArtifactUnpickler(stream).load()


@lru_cache(maxsize=1)
def _load_columns() -> list[str]:
    schema = json.loads((ARTIFACT_DIR / "input_schema.json").read_text(encoding="utf-8"))
    columns = schema.get("columns")
    if not isinstance(columns, list) or not all(isinstance(item, str) for item in columns):
        raise ValueError("Invalid AI artifact input schema")
    return columns


def score_candidates_with_artifact(
    candidates: list[CandidateRoute],
    weights: Weights | None,
    requirements: Requirements | None,
    facility_preferences: dict[str, str] | None,
) -> list[float]:
    rows = build_ai_feature_rows(candidates, weights, requirements, facility_preferences)
    frame = pd.DataFrame(rows)

    for column in _load_columns():
        if column not in frame:
            frame[column] = None

    scores = _load_model().predict_scores(frame[_load_columns()])
    return [float(score) for score in scores]
