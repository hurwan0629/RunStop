from ai.src.models.base import BaseRankingModel


class RandomForestRanker(BaseRankingModel):
    """Pointwise utility regression baseline; request grouping is applied in evaluation."""
    name = "random_forest"

    def fit(self, train, validation):
        from sklearn.ensemble import RandomForestRegressor
        self.estimator = RandomForestRegressor(random_state=self.seed, **self.params)
        self.estimator.fit(self.prepare(train, fit=True), train.utility.to_numpy())
        return self

    def predict_scores(self, candidates):
        return self.check_scores(self.estimator.predict(self.prepare(candidates)), len(candidates))
