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
        """모델 입력 feature를 학습 당시 전처리 형식으로 변환합니다."""
        x = frame[self.columns].apply(pd.to_numeric, errors="raise").astype(float)
        return self.preprocessor.transform(x)

    def check_scores(self, scores: Any, length: int) -> Any:
        """모델이 후보마다 하나의 정상 점수를 반환했는지 확인합니다."""
        import numpy as np

        values = np.asarray(scores, dtype=float)

        if values.shape != (length,) or not np.isfinite(values).all():
            raise ValueError("predict_scores must return one finite score per input row")

        return values


class TreeRanker(BaseRankingModel):
    def predict_scores(self, candidates: pd.DataFrame) -> Any:
        """후보 feature를 전처리한 뒤 ranking 점수를 예측합니다."""
        return self.check_scores(
            self.estimator.predict(self.prepare(candidates)),
            len(candidates),
        )


class LightGBMRanker(TreeRanker):
    name = "lightgbm_ranker"


class ArtifactUnpickler(pickle.Unpickler):
    """AI 프로젝트에서 저장한 모델 클래스를 worker 내부 클래스로 연결합니다."""

    def find_class(self, module: str, name: str) -> Any:
        # pickle에 기록된 원래 모델 클래스를 현재 worker 클래스에 연결
        if module == "ai.src.models.base" and name == "BaseRankingModel":
            return BaseRankingModel

        if module == "ai.src.models.base" and name == "TreeRanker":
            return TreeRanker

        if module == "ai.src.models.implementations.lightgbm_ranker" and name == "LightGBMRanker":
            return LightGBMRanker

        return super().find_class(module, name)


@lru_cache(maxsize=1)
def _load_model() -> Any:
    """artifact 모델을 최초 한 번만 읽어 재사용합니다."""

    with (ARTIFACT_DIR / "model.pkl").open("rb") as stream:
        return ArtifactUnpickler(stream).load()


@lru_cache(maxsize=1)
def _load_columns() -> list[str]:
    """artifact가 학습에 사용한 입력 컬럼을 읽습니다."""

    schema = json.loads(
        (ARTIFACT_DIR / "input_schema.json").read_text(encoding="utf-8")
    )

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
    """후보 경로를 artifact 입력 형태로 변환하고 AI ranking 점수를 반환합니다."""

    # 서비스 후보 데이터를 AI feature로 변환
    rows = build_ai_feature_rows(
        candidates,
        weights,
        requirements,
        facility_preferences,
    )

    frame = pd.DataFrame(rows)

    # 학습 당시 존재했던 입력 컬럼이 없으면 빈 값으로 추가
    for column in _load_columns():
        if column not in frame:
            frame[column] = None

    # 학습 당시 컬럼 순서로 모델 추론
    scores = _load_model().predict_scores(
        frame[_load_columns()]
    )

    return [float(score) for score in scores]