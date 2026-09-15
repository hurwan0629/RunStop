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
    # ui 프로젝트용 함수. cli 방식에서는 신경쓰지 않아도 됨
    return [{"name": name, "title": entry[0], "library": entry[1], "description": entry[4],
             "implemented": True, "installed": entry[1] is None or util.find_spec(entry[1]) is not None,
             "params_schema": PARAM_SCHEMAS[name].model_json_schema(), "defaults": PARAM_SCHEMAS[name]().model_dump()}
            for name, entry in MODELS.items()]


def create_model(config: ModelConfig, columns: Sequence[str], seed: int = 42) -> BaseRankingModel:
    """설정된 모델 이름으로 구현체를 import하고 인스턴스를 생성합니다."""
    # config를 다시 검증해 params가 해당 모델 schema를 통과했는지 보장합니다.
    # (모델을 만들기 위한 값들이 잘 있나) 현재[2026-09-15 12:42:22] 사용중인 모델 7종에 대해서 작업을 하고있음
    config = ModelConfig.model_validate(config.model_dump())
    _, library, module, cls, _ = MODELS[config.name]

    # 선택 dependency가 설치되지 않은 모델은 생성 시점에 명확히 실패시킵니다.
    # 라이브러리가 있고, 그 라이브러리가 파이썬 환경에 설치되어있는지 확인하기
    if library and util.find_spec(library) is None:
        package = "scikit-learn" if library == "sklearn" else library
        raise RuntimeError(f"{config.name} requires {package}. Install it in the experiment Python environment")

    # 가져온 모듈에 대한 클래스를 가져오니다.
    # 클래스를 만들어 바로 call () 을 통해 호출해줍니다.
    return getattr(
            import_module(f"ai.src.models.implementations.{module}"), cls
        )(columns, config.params, seed) # 인자로 입력 컬럼, 파라미터, seed를 설정해줌
