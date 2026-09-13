"""One validated contract for YAML, CLI and the HTML editor (no model imports)."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class EmptyParams(Strict):
    pass


class LogisticParams(Strict):
    C: float = Field(1.0, gt=0, description="규제 강도의 역수. 작을수록 강한 규제")
    max_iter: int = Field(1000, ge=1, le=100000, description="최대 최적화 반복 수")
    solver: Literal["lbfgs", "liblinear"] = "lbfgs"
    class_weight: Literal["balanced"] | None = None


class ForestParams(Strict):
    n_estimators: int = Field(300, ge=1, le=10000, description="트리 개수")
    max_depth: int | None = Field(None, ge=1, le=1000)
    min_samples_leaf: int = Field(2, ge=1)
    max_features: float = Field(1.0, gt=0, le=1)
    n_jobs: int = Field(1, ge=1, le=128)


class LightGBMParams(Strict):
    n_estimators: int = Field(200, ge=1, le=10000)
    learning_rate: float = Field(0.05, gt=0, le=1)
    num_leaves: int = Field(31, ge=2, le=131072, description="트리당 최대 리프 수")
    max_depth: int = Field(-1, ge=-1, le=64, description="-1은 깊이 제한 없음")
    min_child_samples: int = Field(20, ge=1)
    reg_lambda: float = Field(0.0, ge=0)
    n_jobs: int = Field(1, ge=1, le=128)

    @model_validator(mode="after")
    def depth_check(self):
        if self.max_depth == 0:
            raise ValueError("max_depth는 -1 또는 양수여야 합니다")
        return self


class XGBoostParams(Strict):
    n_estimators: int = Field(200, ge=1, le=10000)
    learning_rate: float = Field(0.05, gt=0, le=1)
    max_depth: int = Field(6, ge=1, le=64)
    min_child_weight: float = Field(1.0, ge=0)
    reg_lambda: float = Field(1.0, ge=0)
    n_jobs: int = Field(1, ge=1, le=128)


class CatBoostParams(Strict):
    iterations: int = Field(200, ge=1, le=10000)
    learning_rate: float = Field(0.05, gt=0, le=1)
    depth: int = Field(6, ge=1, le=16)
    l2_leaf_reg: float = Field(3.0, ge=0)
    thread_count: int = Field(1, ge=1, le=128)


class RankNetParams(Strict):
    hidden_dim: int = Field(64, ge=4, le=2048)
    dropout: float = Field(0.1, ge=0, lt=1)
    epochs: int = Field(30, ge=1, le=10000)
    batch_size: int = Field(256, ge=1, le=65536, description="후보 쌍 단위 배치 크기")
    learning_rate: float = Field(0.001, gt=0, le=1)
    weight_decay: float = Field(0.01, ge=0)
    optimizer: Literal["adam", "adamw"] = "adamw"


PARAM_SCHEMAS = {
    "condition_score_baseline": EmptyParams, "logistic_regression": LogisticParams,
    "random_forest": ForestParams, "lightgbm_ranker": LightGBMParams,
    "xgboost_ranker": XGBoostParams, "catboost_ranker": CatBoostParams,
    "ranknet": RankNetParams,
}


class ModelConfig(Strict):
    name: Literal["condition_score_baseline", "logistic_regression", "random_forest",
                  "lightgbm_ranker", "xgboost_ranker", "catboost_ranker", "ranknet"] = "lightgbm_ranker"
    params: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_params(self):
        self.params = PARAM_SCHEMAS[self.name].model_validate(self.params).model_dump()
        return self


class UtilityParams(Strict):
    profile_share: float = Field(0.7, ge=0, le=1, description="장기 성향 비중. 나머지는 요청 가중치")
    distance_tolerance_ratio: float = Field(0.15, gt=0, le=1)
    slope_scale_pct: float = Field(8.0, gt=0, description="경사 만족도가 감소하는 척도 (%)")
    facility_scale_per_km: float = Field(1.0, gt=0)
    night_scale_per_km: float = Field(10.0, gt=0)
    flow_scale_per_km: float = Field(5.0, gt=0)
    requirement_violation_penalty: float = Field(0.25, ge=0, le=1)
    missing_satisfaction: float = Field(0.0, ge=0, le=1, description="측정 누락 시 만족도. 0은 보수적인 기본값")


class UtilityConfig(Strict):
    name: Literal["preference_v1"] = "preference_v1"
    version: str = Field("utility_v001", pattern=r"^[A-Za-z0-9_-]+$")
    params: UtilityParams = Field(default_factory=UtilityParams)
    relevance_levels: int = Field(5, ge=2, le=16, description="Utility [0,1]을 고정 폭 정수 등급으로 변환")
    tie_decimals: int = Field(8, ge=0, le=12)


class CandidatePolicy(Strict):
    minimum: int = Field(6, ge=2, le=100)
    target: int = Field(8, ge=2, le=100)
    maximum: int = Field(10, ge=2, le=100)
    shortage: Literal["exclude", "error"] = "exclude"
    excess: Literal["seeded_sample"] = "seeded_sample"
    retries: int = Field(1, ge=0, le=10, description="부족하면 방향 수를 늘려 같은 요청 재시도")

    @model_validator(mode="after")
    def ordered(self):
        if not self.minimum <= self.target <= self.maximum:
            raise ValueError("minimum <= target <= maximum 이어야 합니다")
        return self


class GenerationConfig(Strict):
    kind: Literal["generation"] = "generation"
    schema_version: Literal[1] = 1
    version: str = Field("candidates_v001", pattern=r"^[A-Za-z0-9_-]+$")
    seed: int = Field(42, ge=0, le=2147483647)
    source_json: str = "datasets/runstop_users_1000_5000_requests.json"
    expected_users: int = Field(1000, ge=1)
    expected_requests: int = Field(5000, ge=1)
    output_dir: str = "datasets/candidates_v001"
    routing_worker_dir: str = "../routing-worker"
    worker_python: str = ""  # empty means current interpreter
    data_root: str = "../routing-worker/src/algo/data"
    graph_path: str = "../routing-worker/src/algo/data/서울_보행네트워크.graphml"
    workers: int = Field(1, ge=1, le=64)
    n_directions: int = Field(16, ge=1, le=360)
    timeout_seconds: int = Field(86400, ge=1, description="전체 워커 실행 제한 시간")
    request_error: Literal["exclude", "error"] = "exclude"
    candidates: CandidatePolicy = Field(default_factory=CandidatePolicy)
    utility: UtilityConfig = Field(default_factory=UtilityConfig)


class FeatureConfig(Strict):
    use_profile: bool = True
    use_request: bool = True
    use_requirements: bool = True
    use_candidate_features: bool = True
    use_condition_score: bool = False
    use_history: Literal[False] = False  # no observed choices in the input dataset


class SplitConfig(Strict):
    strategy: Literal["user_temporal_holdout"] = "user_temporal_holdout"
    seed: int = Field(42, ge=0, le=2147483647)
    cold_user_ratio: float = Field(0.2, gt=0, lt=1)
    validation_requests: int = Field(1, ge=1)
    test_requests: int = Field(1, ge=1)
    min_train_requests: int = Field(1, ge=1)
    insufficient_user: Literal["exclude", "error"] = "exclude"


class EvaluationConfig(Strict):
    top_k: int = Field(3, ge=1, le=100)
    bootstrap_samples: int = Field(1000, ge=0, le=10000)
    confidence_level: float = Field(0.95, gt=0, lt=1)


class ExperimentConfig(Strict):
    kind: Literal["experiment"] = "experiment"
    schema_version: Literal[1] = 1
    name: str = Field("lightgbm_compare", pattern=r"^[A-Za-z0-9_-]+$")
    seed: int = Field(42, ge=0, le=2147483647)
    dataset_path: str = "datasets/candidates_v001/candidates.parquet"
    metadata_path: str = "datasets/candidates_v001/metadata.json"
    features: FeatureConfig = Field(default_factory=FeatureConfig)
    split: SplitConfig = Field(default_factory=SplitConfig)
    model: ModelConfig = Field(default_factory=ModelConfig)
    evaluation: EvaluationConfig = Field(default_factory=EvaluationConfig)
    output_dir: str = "artifacts"


def validate_config(data):
    if not isinstance(data, dict) or data.get("kind") not in {"generation", "experiment"}:
        raise ValueError("kind: generation 또는 experiment가 필요합니다 (schema_version: 1)")
    cls = GenerationConfig if data["kind"] == "generation" else ExperimentConfig
    return cls.model_validate(data)
