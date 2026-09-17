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

        # train 데이터 전처리 해서 준비시키기
        x = torch.tensor(self.prepare(train, fit=True), dtype=torch.float32)
        vx = torch.tensor(self.prepare(validation), dtype=torch.float32)

        # 대소 관계 인덱스 잡아주기
        # left가 더 큰 인덱스
        # right가 더 작은 수의 인덱스
        # 예)
        # 데이터: [0.9, 0.4, 0.1]
        # left  = [0, 0, 1]
        # right = [1, 1, 2]
        left, right = preference_pairs(train)
        # 검증용 조합
        vl, vr = preference_pairs(validation)
        if not len(left):
            raise ValueError("No unequal utility pairs in training requests")

        # 작은 MLP와 optimizer/loss를 구성합니다.
        layers = []
        input_dim = x.shape[1]
        # 모델의 파라미터에 depth만큼 신경망을 쌓아주기
        for _ in range(p["depth"]):
            layers.extend([
                # 선형함수
                nn.Linear(input_dim, p["hidden_dim"]),
                # 비선형 함수
                nn.ReLU(),
                # 과적합 방지
                nn.Dropout(p["dropout"]),
            ])
            input_dim = p["hidden_dim"]
        # 마지막에 layer 1 넣어주기
        self.estimator = nn.Sequential(*layers, nn.Linear(input_dim, 1))

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
            # 모델 train 시키기
            self.estimator.train()
            # 
            order = rng.permutation(len(left))
            total = 0.0
            # batch size 만큼 씩 학습시켜주기
            for start in range(0, len(order), p["batch_size"]):
                # batch_size씩 잘라서 읽어주기
                # 이때 batch는 left/right 한쌍들에 대한 랜덤 shuffled 인덱스 리스트
                batch = order[start:start + p["batch_size"]]
                # 한스텝 걸어주기
                optimizer.zero_grad()
                # loss와 거의 동일한 개념이지만 모델로 예측한 left(큰거), right(작은거) 의 차이를 loss로 잡음
                # 예를 들어서 실제로 잘 맞추면 아래의 값이 양수가 되어 1로 나오고 아니면 0으로 나옴
                difference = (self.estimator(x[left[batch]]) - self.estimator(x[right[batch]])).flatten()
                loss = loss_fn(
                    difference, 
                    torch.ones_like(difference) # 이미 정답 라벨은 모두 1이여야 하기 때문에 그냥 동일한 shape의 1로 만들어주기.
                )
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
