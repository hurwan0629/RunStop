from ai.src.models.base import TreeRanker


class XGBoostRanker(TreeRanker):
    """TreeRanker 공통 흐름을 사용하는 XGBoost rank:ndcg 구현체입니다."""
    name = "xgboost_ranker"
