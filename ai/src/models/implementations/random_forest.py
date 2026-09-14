from ai.src.models.base import BaseRankingModel


class RandomForestRanker(BaseRankingModel):
    """pointwise utility 회귀 baseline입니다. 요청별 grouping은 평가 단계에서 적용합니다."""
    name = "random_forest"

    def fit(self, train, validation):
        """후보 feature에서 utility 값을 직접 회귀합니다."""
        from sklearn.ensemble import RandomForestRegressor
        self.estimator = RandomForestRegressor(random_state=self.seed, **self.params)
        self.estimator.fit(self.prepare(train, fit=True), train.utility.to_numpy())
        return self

    def predict_scores(self, candidates):
        """회귀 예측 utility를 ranking 점수로 사용합니다."""
        return self.check_scores(self.estimator.predict(self.prepare(candidates)), len(candidates))
