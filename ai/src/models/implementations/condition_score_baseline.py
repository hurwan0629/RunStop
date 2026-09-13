from ai.src.models.base import BaseRankingModel


class ConditionScoreBaseline(BaseRankingModel):
    name = "condition_score_baseline"

    def fit(self, train, validation):
        self.columns = ["condition_score"]
        return self

    def predict_scores(self, candidates):
        return self.check_scores(candidates["condition_score"].to_numpy(), len(candidates))
