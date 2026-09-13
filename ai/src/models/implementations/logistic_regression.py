import numpy as np
from ai.src.models.base import BaseRankingModel


class LogisticRegressionRanker(BaseRankingModel):
    """Pairwise logistic regression; predicts a scalar linear preference, not selected probability."""
    name = "logistic_regression"

    def fit(self, train, validation):
        from sklearn.linear_model import LogisticRegression
        from ai.src.models.pairs import preference_pairs
        ordered = train.reset_index(drop=True)
        x = self.prepare(ordered, fit=True)
        left, right = preference_pairs(ordered)
        if not len(left):
            raise ValueError("No unequal utility pairs in training requests")
        differences = x[left] - x[right]
        self.estimator = LogisticRegression(fit_intercept=False, random_state=self.seed, **self.params)
        self.estimator.fit(np.concatenate([differences, -differences]), np.concatenate([np.ones(len(left)), np.zeros(len(left))]))
        return self

    def predict_scores(self, candidates):
        return self.check_scores(self.estimator.decision_function(self.prepare(candidates)), len(candidates))
