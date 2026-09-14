from ai.src.models.base import BaseRankingModel


class ConditionScoreBaseline(BaseRankingModel):
    """worker의 condition_score를 그대로 쓰는 학습 없는 baseline입니다."""
    name = "condition_score_baseline"

    def fit(self, train, validation):
        """학습 없이 condition_score 컬럼만 사용하도록 고정합니다."""
        self.columns = ["condition_score"]
        return self

    def predict_scores(self, candidates):
        """condition_score를 ranking 점수로 그대로 반환합니다."""
        return self.check_scores(candidates["condition_score"].to_numpy(), len(candidates))
