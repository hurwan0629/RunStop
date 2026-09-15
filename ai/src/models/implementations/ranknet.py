import numpy as np
from ai.src.models.base import BaseRankingModel
from ai.src.models.pairs import preference_pairs


class RankNet(BaseRankingModel):
    """간단한 MLP로 pairwise RankNet 손실을 학습합니다."""
    name = "ranknet"

    def fit(self, train, validation):
        """utility 순서쌍을 BCEWithLogitsLoss로 학습합니다."""
        import torch
        from torch import nn
        p = self.params

        # 입력 feature와 pairwise index를 torch tensor로 준비합니다.

        # 시드 고정시키기
        torch.manual_seed(self.seed)

        # 
        x = torch.tensor(self.prepare(train, fit=True), dtype=torch.float32)
        vx = torch.tensor(self.prepare(validation), dtype=torch.float32)
        left, right = preference_pairs(train)
        vl, vr = preference_pairs(validation)
        if not len(left):
            raise ValueError("No unequal utility pairs in training requests")

        # 작은 MLP와 optimizer/loss를 구성합니다.
        self.estimator = nn.Sequential(
            nn.Linear(x.shape[1], p["hidden_dim"]), 
            nn.ReLU(), 
            nn.Dropout(p["dropout"]), 
            nn.Linear(p["hidden_dim"], 1)
        )

        # 옵티마이저
        optimizer_cls = torch.optim.AdamW if p["optimizer"] == "adamw" else torch.optim.Adam
        # lr과 weight_decay 설정
        optimizer = optimizer_cls(self.estimator.parameters(), lr=p["learning_rate"], weight_decay=p["weight_decay"])
        # 손실함수는 BCE로 고정
        loss_fn = nn.BCEWithLogitsLoss()
        # 난수 생성기 고정
        rng = np.random.default_rng(self.seed)
        # 학습 과정 기록
        self.history = {"train_pair_loss": [], "validation_pair_loss": []}

        # epoch마다 순서쌍 batch를 섞어 학습하고 validation pair loss를 기록합니다.
        for _ in range(p["epochs"]):
            self.estimator.train()
            order = rng.permutation(len(left))
            total = 0.0
            for start in range(0, len(order), p["batch_size"]):
                batch = order[start:start + p["batch_size"]]
                optimizer.zero_grad()
                difference = (self.estimator(x[left[batch]]) - self.estimator(x[right[batch]])).flatten()
                loss = loss_fn(difference, torch.ones_like(difference))
                loss.backward()
                optimizer.step()
                total += loss.item() * len(batch)
            self.history["train_pair_loss"].append(total / len(left))
            self.estimator.eval()
            with torch.no_grad():
                difference = (self.estimator(vx[vl]) - self.estimator(vx[vr])).flatten()
                self.history["validation_pair_loss"].append(loss_fn(difference, torch.ones_like(difference)).item() if len(vl) else None)
        return self

    def predict_scores(self, candidates):
        """MLP 출력값을 후보 ranking 점수로 사용합니다."""
        import torch
        self.estimator.eval()
        with torch.no_grad():
            scores = self.estimator(torch.tensor(self.prepare(candidates), dtype=torch.float32)).flatten().numpy()
        return self.check_scores(scores, len(candidates))
