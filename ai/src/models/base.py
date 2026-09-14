"""저장 가능한 학습 모델 번들입니다. 입력 schema, 전처리기, estimator를 함께 보관합니다."""
from pathlib import Path
import json
import pickle
import numpy as np
from ai.src.dataset.features import build_model_input


class BaseRankingModel:
    """모든 ranking 모델 구현체가 따르는 최소 인터페이스입니다."""
    name = "base"

    def __init__(self, columns, params=None, seed=42):
        """입력 컬럼 순서와 모델 파라미터를 저장합니다."""
        self.columns = list(columns)
        self.params = params or {}
        self.seed = seed
        self.preprocessor = None
        self.estimator = None
        self.history = {}

    def fit(self, train, validation):
        """구현체에서 학습 로직을 제공합니다."""
        raise NotImplementedError

    def predict_scores(self, candidates):
        """구현체에서 후보별 점수 예측 로직을 제공합니다."""
        raise NotImplementedError

    def prepare(self, frame, fit=False):
        """선택된 feature를 숫자 행렬로 바꾸고 결측/스케일 전처리를 적용합니다."""
        from sklearn.impute import SimpleImputer
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler

        # 입력 컬럼 검증과 숫자 변환은 dataset.features에서 공통 처리합니다.
        x = build_model_input(frame, self.columns)
        if fit:
            # 전처리기는 train에서만 fit하고 이후 split에는 transform만 적용합니다.
            self.preprocessor = make_pipeline(SimpleImputer(strategy="median", add_indicator=True, keep_empty_features=True), StandardScaler())
            return self.preprocessor.fit_transform(x)
        return self.preprocessor.transform(x)

    def check_scores(self, scores, length):
        """예측 결과가 입력 행 수와 같은 finite 1차원 점수인지 확인합니다."""
        values = np.asarray(scores, dtype=float)
        if values.shape != (length,) or not np.isfinite(values).all():
            raise ValueError("predict_scores must return one finite score per input row")
        return values

    def feature_importance(self):
        """지원되는 estimator에서 feature importance 또는 계수를 꺼냅니다."""
        if self.estimator is None or self.preprocessor is None:
            return None
        values = getattr(self.estimator, "feature_importances_", None)
        if values is None and hasattr(self.estimator, "coef_"):
            values = self.estimator.coef_.reshape(-1)
        if values is None:
            return None
        names = self.preprocessor.get_feature_names_out(self.columns)
        return [{"feature": str(name), "value": float(value)} for name, value in zip(names, values)]

    def save(self, directory):
        """모델 pickle과 입력 schema 설명을 디렉터리에 저장합니다."""
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=False)
        with (path / "model.pkl").open("wb") as stream:
            pickle.dump(self, stream, protocol=pickle.HIGHEST_PROTOCOL)
        schema = {"schema_version": 1, "model_name": self.name, "columns": self.columns,
                  "dtype": "float64", "missing": "train median; all-missing column = 0; indicators; StandardScaler" if self.preprocessor else "not applicable",
                  "output": "one finite float per input row; higher ranks first within request",
                  "bundle": "model.pkl includes fitted preprocessing and estimator"}
        (path / "input_schema.json").write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")

    @staticmethod
    def load(directory):
        """신뢰한 실험 artifact만 로드합니다. pickle은 코드 실행이 가능합니다."""
        with (Path(directory) / "model.pkl").open("rb") as stream:
            model = pickle.load(stream)
        if not isinstance(model, BaseRankingModel):
            raise ValueError("Not a RunStop ranking bundle")
        return model


class TreeRanker(BaseRankingModel):
    """LightGBM/XGBoost/CatBoost 계열 ranker의 공통 학습 흐름입니다."""
    def fit(self, train, validation):
        """요청별 group 정보를 유지한 채 tree ranker를 학습합니다."""
        # group 기반 ranker는 request_id/candidate_id 정렬을 고정해야 재현성이 좋아집니다.
        train = train.sort_values(["request_id", "candidate_id"])
        validation = validation.sort_values(["request_id", "candidate_id"])

        # train/validation feature, label, group 크기를 준비합니다.
        x = self.prepare(train, fit=True)
        vx = self.prepare(validation)
        y = train.relevance.to_numpy(dtype=int)
        vy = validation.relevance.to_numpy(dtype=int)
        groups = train.groupby("request_id", sort=False).size().to_numpy()
        vgroups = validation.groupby("request_id", sort=False).size().to_numpy()

        # 구현체별 fit 인자 차이만 분기하고 외부 계약은 동일하게 유지합니다.
        if self.name == "lightgbm_ranker":
            from inspect import signature
            from lightgbm import LGBMRanker
            self.estimator = LGBMRanker(objective="lambdarank", random_state=self.seed, verbosity=-1, **self.params)
            validation_args = {"eval_X": vx, "eval_y": vy} if "eval_X" in signature(self.estimator.fit).parameters else {"eval_set": [(vx, vy)]}
            self.estimator.fit(x, y, group=groups, eval_group=[vgroups], **validation_args)
            self.history = self.estimator.evals_result_
        elif self.name == "xgboost_ranker":
            from xgboost import XGBRanker
            self.estimator = XGBRanker(objective="rank:ndcg", random_state=self.seed, **self.params)
            self.estimator.fit(x, y, group=groups, eval_set=[(vx, vy)], eval_group=[vgroups], verbose=False)
            self.history = self.estimator.evals_result()
        elif self.name == "catboost_ranker":
            from catboost import CatBoostRanker, Pool
            self.estimator = CatBoostRanker(loss_function="YetiRank", random_seed=self.seed, verbose=False, allow_writing_files=False, **self.params)
            pool = Pool(x, y, group_id=train.request_id.to_numpy())
            vpool = Pool(vx, vy, group_id=validation.request_id.to_numpy())
            self.estimator.fit(pool, eval_set=vpool, use_best_model=False)
            self.history = self.estimator.get_evals_result()
        return self

    def predict_scores(self, candidates):
        """tree estimator의 예측값을 후보 ranking 점수로 사용합니다."""
        return self.check_scores(self.estimator.predict(self.prepare(candidates)), len(candidates))
