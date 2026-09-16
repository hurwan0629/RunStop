"""저장 가능한 학습 모델 번들입니다. 입력 schema, 전처리기, estimator를 함께 보관합니다."""
from collections.abc import Sequence
from pathlib import Path
import json
import pickle
import numpy as np
import pandas as pd
from ai.src.dataset.features import build_model_input


class BaseRankingModel:
    """모든 ranking 모델 구현체가 따르는 최소 인터페이스입니다."""
    name = "base"

    def __init__(self, columns: Sequence[str], params: dict | None = None, seed: int = 42):
        """입력 컬럼 순서와 모델 파라미터를 저장합니다."""
        self.columns = list(columns) # 입력 컬럼들 list 형태로 저장
        self.params = params or {} # 내부적으로 파라미터 있는 것들을 채워주기
        self.seed = seed # 시드 고정
        self.preprocessor = None # 전처리 방식
        self.estimator = None # 트리 형식은 estimator 받음
        self.history = {} # 학습 기록 저장용

    # # # # # # # # # # [구현체가 구현해야하는 부분] # # # # # # # # # # 
    def fit(self, train: pd.DataFrame, validation: pd.DataFrame):
        """구현체에서 학습 로직을 제공합니다."""
        raise NotImplementedError

    # candidates가 ([후보 개수], [피처 종류]) 라면
    # predict는 ([후보 개수], ) 로 정규화와 관계없이 모델별로 다른 범위의 비교 가능한 수치들이 생성됩니다.
    def predict_scores(self, candidates: pd.DataFrame):
        """구현체에서 후보별 점수 예측 로직을 제공합니다."""
        raise NotImplementedError
    # # # # # # # # # # # # # # [여기까지] # # # # # # # # # # # # # # 

    # 전처리
    def prepare(self, frame: pd.DataFrame, fit: bool = False) -> np.ndarray:
        """
        선택된 feature를 숫자 행렬로 바꾸고 결측/스케일 전처리를 적용합니다.
        fit: True/False를 이용하여 훈련과 테스트/검증 데이터의 처리를 동시에 진행합니다.
        """
        # dataframe 타입을 이용해서 공통적으로 전처리
        from sklearn.impute import SimpleImputer # 
        from sklearn.pipeline import make_pipeline
        from sklearn.preprocessing import StandardScaler

        # 입력 컬럼 검증과 숫자 변환은 dataset.features에서 공통 처리합니다.
        # 현재[2026-09-15 14:10:30] 입력 스키마는 bool과 float 정도만 있기 때문에 
        #     이를 모두 수치형으로 변형해줍니다.
        x = build_model_input(frame, self.columns)
        if fit:
            # 전처리기는 train에서만 fit하고 이후 split에는 transform만 적용합니다.
            self.preprocessor = make_pipeline(
                # 결측치는 없는 취급이지만 있다면 중앙값 처리
                # 원래 결측치였는지 표시하는 열을 사용해줍니다.
                # 특정 열 자체가 전무 NaN이여도 열을 버리지 않습니다. (서비스 시에 망가지지 않게 하기 위해)
                SimpleImputer(strategy="median", add_indicator=True, keep_empty_features=True), 
                # 정규화 (표준화)
                StandardScaler()
            )
            return self.preprocessor.fit_transform(x)
        return self.preprocessor.transform(x)

    def check_scores(self, scores, length: int) -> np.ndarray:
        """예측 결과가 입력 행 수와 같은 finite 1차원 점수인지 확인합니다."""
        values = np.asarray(scores, dtype=float)
        if values.shape != (length,) or not np.isfinite(values).all():
            raise ValueError("predict_scores must return one finite score per input row")
        return values

    def feature_importance(self) -> list[dict[str, float | str]] | None:
        """지원되는 estimator에서 feature importance 또는 계수를 꺼냅니다."""
        if self.estimator is None or self.preprocessor is None:
            return None
        values = getattr(self.estimator, "feature_importances_", None)
        if values is None and hasattr(self.estimator, "coef_"):
            values = self.estimator.coef_.reshape(-1)
        if values is None:
            return None
        values = np.asarray(values, dtype=float).reshape(-1)
        names = self.preprocessor.get_feature_names_out(self.columns)
        if len(values) != len(names):
            return None
        return [{"feature": str(name), "value": float(value)} for name, value in zip(names, values)]

    def save(self, directory: str | Path) -> None:
        """모델 pickle과 입력 schema 설명을 디렉터리에 저장합니다."""
        path = Path(directory)
        path.mkdir(parents=True, exist_ok=False)
        with (path / "model.pkl").open("wb") as stream:
            pickle.dump(self, stream, protocol=pickle.HIGHEST_PROTOCOL)
        schema = {"schema_version": 1, "model_name": self.name, "columns": self.columns,
                  "dtype": "float64", 
                  "missing": "train median; all-missing column = 0; indicators; StandardScaler" if self.preprocessor else "not applicable",
                  "output": "one finite float per input row; higher ranks first within request",
                  "bundle": "model.pkl includes fitted preprocessing and estimator"}
        (path / "input_schema.json").write_text(json.dumps(schema, ensure_ascii=False, indent=2), encoding="utf-8")

    # 이미 만들어져있는 artifact(기록들)을 불러오는 과정에서 사용합니다. 보통 테스트 또는 서비스에서 사용합니다.
    @staticmethod
    def load(directory: str | Path):
        """신뢰한 실험 artifact만 로드합니다. pickle은 코드 실행이 가능합니다."""
        with (Path(directory) / "model.pkl").open("rb") as stream:
            model = pickle.load(stream)
        # 예상 가능한 모델이 아닌 경우에는 없애주기
        if not isinstance(model, BaseRankingModel):
            raise ValueError("Not a RunStop ranking bundle")
        return model


class TreeRanker(BaseRankingModel):
    """LightGBM/XGBoost/CatBoost 계열 ranker의 공통 학습 흐름입니다."""
    def fit(self, train: pd.DataFrame, validation: pd.DataFrame):
        """요청별 group 정보를 유지한 채 tree ranker를 학습합니다."""

        # group 기반 ranker는 request_id/candidate_id 정렬을 고정해야 재현성이 좋아집니다.
        train = train.sort_values(["request_id", "candidate_id"])
        validation = validation.sort_values(["request_id", "candidate_id"])

        # train/validation feature, label, group 크기를 준비합니다.
        # train_x
        x = self.prepare(train, fit=True)
        # validation_x (fit [x])
        vx = self.prepare(validation)
        # train_y
        y = train.relevance.to_numpy(dtype=int)
        # validation_y
        vy = validation.relevance.to_numpy(dtype=int)

        # 요청별로 후보들 묶기. 각각의 요청마다 cands 사이즈가 몇인지 줘서 학습할 수 있게 해주기
        groups = train.groupby("request_id", sort=False).size().to_numpy()
        # val도 위와 동일하게 묶어주기
        vgroups = validation.groupby("request_id", sort=False).size().to_numpy()

        # 구현체별 fit 인자 차이만 분기하고 외부 계약은 동일하게 유지합니다.
        # 앙상블 기ㅏㅂㄴ
        if self.name == "lightgbm_ranker":
            """
            LightGBM의 경우에는 Histogram 기반의 분할 방식으로 Leaf-wise tree growth 방식을 사용합니다.
            Leaf-wise tree growth란 모든 leaf를 동일하게 키우지 않고 loss 를 줄이는 leaf를 집중적으로 확장하는 형태입니다.

            또한 히스토그램 방식으로 연속형 feature의 값을 여러 구간으로 묶어서 split 후보를 줄이는 방식입니다.
            """
            from inspect import signature
            from lightgbm import LGBMRanker

            # NDCG 점수 기반 LambdaMART 모델
            self.estimator = LGBMRanker(
                objective="lambdarank", 
                random_state=self.seed, 
                verbosity=-1, 
                **self.params
            )

            # signature()함수는 해당 트리 랭커의 fit 함수에 있는 
            # 시그니처 중에서 eval_X라는 파라미터를 받는지 확인하는 부분
            #     - 버전마다 인터페이스가 다를 수 있어서 적용하는 부분
            validation_args = \
              {"eval_X": vx, "eval_y": vy} \
              if "eval_X" in signature(self.estimator.fit).parameters \
              else {"eval_set": [(vx, vy)]}

            # 학습 중 validation 데이터를 같이 평가하게 하기 위해 eval_group와 eval_X,y를 주기
            self.estimator.fit(
                x, y, group=groups, 
                eval_group=[vgroups], **validation_args)
            self.history = self.estimator.evals_result_

        # xgboost 트리 모델 기반
        elif self.name == "xgboost_ranker":
            """
            XGBoost가 제공하는 Learning to Rank 전용 estimator

            gbdt 기반 트리 부스팅 모델. 숫자 오차 자체를 줄이는게 아니라 같은 요청 안의 후보 순서를 잘 맞추도록 학습
            """
            from xgboost import XGBRanker

            self.estimator = XGBRanker(
                objective="rank:ndcg", 
                random_state=self.seed, 
                **self.params
            )
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

    def predict_scores(self, candidates: pd.DataFrame) -> np.ndarray:
        """tree estimator의 예측값을 후보 ranking 점수로 사용합니다."""
        return self.check_scores(self.estimator.predict(self.prepare(candidates)), len(candidates))
