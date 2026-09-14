import numpy as np
from ai.src.models.base import BaseRankingModel


class LogisticRegressionRanker(BaseRankingModel):
    """pairwise logistic regression입니다. 선택 확률이 아니라 선형 선호 점수를 예측합니다."""
    name = "logistic_regression"

    def fit(self, train, validation):
        """utility 순서쌍 차이를 이용해 선호 방향을 학습합니다."""
        from sklearn.linear_model import LogisticRegression
        from ai.src.models.pairs import preference_pairs

        # 후보 feature를 전처리하고 utility가 다른 후보 쌍을 만듭니다.
        ordered = train.reset_index(drop=True)
        x = self.prepare(ordered, fit=True)
        left, right = preference_pairs(ordered)
        if not len(left):
            raise ValueError("No unequal utility pairs in training requests")

        # 양방향 차이를 함께 넣어 intercept 없는 선형 preference를 학습합니다.
        differences = x[left] - x[right]
        self.estimator = LogisticRegression(fit_intercept=False, random_state=self.seed, **self.params)
        self.estimator.fit(np.concatenate([differences, -differences]), np.concatenate([np.ones(len(left)), np.zeros(len(left))]))
        return self

    def predict_scores(self, candidates):
        """decision_function 값을 ranking 점수로 사용합니다."""
        return self.check_scores(self.estimator.decision_function(self.prepare(candidates)), len(candidates))
