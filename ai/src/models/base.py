"""Portable fitted bundle: ordered numeric schema + training-only preprocessing + estimator."""
from pathlib import Path
import json
import pickle
import numpy as np
from ai.src.dataset.features import build_model_input


class BaseRankingModel:
    name = "base"

    def __init__(self, columns, params=None, seed=42):
        self.columns = list(columns)
        self.params = params or {}
        self.seed = seed
        self.preprocessor = None
        self.estimator = None
        self.history = {}

    def fit(self, train, validation):
        raise NotImplementedError

    def predict_scores(self, candidates):
        raise NotImplementedError

    def prepare(self, frame, fit=False):
        from sklearn.impute import SimpleImputer
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler
        x = build_model_input(frame, self.columns)
        if fit:
            self.preprocessor = make_pipeline(SimpleImputer(strategy="median", add_indicator=True, keep_empty_features=True), StandardScaler())
            return self.preprocessor.fit_transform(x)
        return self.preprocessor.transform(x)

    def check_scores(self, scores, length):
        values = np.asarray(scores, dtype=float)
        if values.shape != (length,) or not np.isfinite(values).all():
            raise ValueError("predict_scores must return one finite score per input row")
        return values

    def feature_importance(self):
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
        """Load only artifacts created by a trusted experiment (pickle executes code)."""
        with (Path(directory) / "model.pkl").open("rb") as stream:
            model = pickle.load(stream)
        if not isinstance(model, BaseRankingModel):
            raise ValueError("Not a RunStop ranking bundle")
        return model


class TreeRanker(BaseRankingModel):
    def fit(self, train, validation):
        train = train.sort_values(["request_id", "candidate_id"])
        validation = validation.sort_values(["request_id", "candidate_id"])
        x = self.prepare(train, fit=True)
        vx = self.prepare(validation)
        y = train.relevance.to_numpy(dtype=int)
        vy = validation.relevance.to_numpy(dtype=int)
        groups = train.groupby("request_id", sort=False).size().to_numpy()
        vgroups = validation.groupby("request_id", sort=False).size().to_numpy()
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
        return self.check_scores(self.estimator.predict(self.prepare(candidates)), len(candidates))
