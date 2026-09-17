from ai.src.models.base import TreeRanker


class LightGBMRanker(TreeRanker):
    """TreeRanker 공통 흐름을 사용하는 LightGBM LambdaRank 구현체입니다."""
    name = "lightgbm_ranker"
