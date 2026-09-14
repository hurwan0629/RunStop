from ai.src.models.base import TreeRanker


class CatBoostRanker(TreeRanker):
    """TreeRanker 공통 흐름을 사용하는 CatBoost YetiRank 구현체입니다."""
    name = "catboost_ranker"
