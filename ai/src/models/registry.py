"""모델 이름과 구현체 클래스를 연결하는 registry입니다."""
from collections.abc import Sequence
from importlib import import_module, util
from ai.src.config.schema import PARAM_SCHEMAS, ModelConfig
from ai.src.models.base import BaseRankingModel

MODELS = {
    "condition_score_baseline": ("Condition score", None, "condition_score_baseline", "ConditionScoreBaseline", "기존 점수 정렬 · 학습 없음"),
    "logistic_regression": ("Logistic Regression", "sklearn", "logistic_regression", "LogisticRegressionRanker", "Utility 선호 쌍을 학습하는 선형 모델"),
    "random_forest": ("Random Forest", "sklearn", "random_forest", "RandomForestRanker", "Utility 회귀 · 트리 앙상블"),
    "lightgbm_ranker": ("LightGBM Ranker", "lightgbm", "lightgbm_ranker", "LightGBMRanker", "요청별 relevance 순위 학습 · LambdaRank"),
    "xgboost_ranker": ("XGBoost Ranker", "xgboost", "xgboost_ranker", "XGBoostRanker", "요청별 relevance 순위 학습 · rank:ndcg"),
    "catboost_ranker": ("CatBoost Ranker", "catboost", "catboost_ranker", "CatBoostRanker", "요청별 relevance 순위 학습 · YetiRank"),
    "ranknet": ("RankNet", "torch", "ranknet", "RankNet", "Utility 선호 쌍을 학습하는 CPU 신경망"),
}


def catalog():
    """UI/CLI가 사용할 모델 목록, 설치 여부, 파라미터 schema를 반환합니다."""
    return [{"name": name, "title": entry[0], "library": entry[1], "description": entry[4],
             "implemented": True, "installed": entry[1] is None or util.find_spec(entry[1]) is not None,
             "params_schema": PARAM_SCHEMAS[name].model_json_schema(), "defaults": PARAM_SCHEMAS[name]().model_dump()}
            for name, entry in MODELS.items()]


def create_model(config: ModelConfig, columns: Sequence[str], seed: int = 42) -> BaseRankingModel:
    """설정된 모델 이름으로 구현체를 import하고 인스턴스를 생성합니다."""
    # config를 다시 검증해 params가 해당 모델 schema를 통과했는지 보장합니다.
    config = ModelConfig.model_validate(config.model_dump())
    _, library, module, cls, _ = MODELS[config.name]

    # 선택 dependency가 설치되지 않은 모델은 생성 시점에 명확히 실패시킵니다.
    if library and util.find_spec(library) is None:
        package = "scikit-learn" if library == "sklearn" else library
        raise RuntimeError(f"{config.name} requires {package}. Install it in the experiment Python environment")
    return getattr(import_module(f"ai.src.models.implementations.{module}"), cls)(columns, config.params, seed)
