from importlib import import_module, util
from ai.src.config.schema import PARAM_SCHEMAS, ModelConfig

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
    return [{"name": name, "title": entry[0], "library": entry[1], "description": entry[4],
             "implemented": True, "installed": entry[1] is None or util.find_spec(entry[1]) is not None,
             "params_schema": PARAM_SCHEMAS[name].model_json_schema(), "defaults": PARAM_SCHEMAS[name]().model_dump()}
            for name, entry in MODELS.items()]


def create_model(config, columns, seed=42):
    config = ModelConfig.model_validate(config.model_dump())
    _, library, module, cls, _ = MODELS[config.name]
    if library and util.find_spec(library) is None:
        package = "scikit-learn" if library == "sklearn" else library
        raise RuntimeError(f"{config.name} requires {package}. Install it in the experiment Python environment")
    return getattr(import_module(f"ai.src.models.implementations.{module}"), cls)(columns, config.params, seed)
