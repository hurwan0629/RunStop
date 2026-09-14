"""YAML, CLI, HTML 에디터가 공유하는 검증된 설정 계약입니다. 모델 import는 하지 않습니다."""
from typing import Annotated, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class Strict(BaseModel):
    """알 수 없는 필드와 느슨한 타입 변환을 막는 공통 BaseModel입니다."""
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)


class EmptyParams(Strict):
    """추가 파라미터가 없는 모델에서 사용하는 빈 params schema입니다."""
    pass


class LogisticParams(Strict):
    """LogisticRegressionRanker 파라미터입니다."""
    C: float = Field(1.0, gt=0, description="규제 강도의 역수. 작을수록 강한 규제")
    max_iter: int = Field(1000, ge=1, le=100000, description="최대 최적화 반복 수")
    solver: Literal["lbfgs", "liblinear"] = "lbfgs"
    class_weight: Literal["balanced"] | None = None


class ForestParams(Strict):
    """RandomForestRanker 파라미터입니다."""
    n_estimators: int = Field(300, ge=1, le=10000, description="트리 개수")
    max_depth: int | None = Field(None, ge=1, le=1000)
    min_samples_leaf: int = Field(2, ge=1)
    max_features: float = Field(1.0, gt=0, le=1)
    n_jobs: int = Field(1, ge=1, le=128)


class LightGBMParams(Strict):
    """LightGBMRanker 파라미터입니다."""
    n_estimators: int = Field(200, ge=1, le=10000)
    learning_rate: float = Field(0.05, gt=0, le=1)
    num_leaves: int = Field(31, ge=2, le=131072, description="트리당 최대 리프 수")
    max_depth: int = Field(-1, ge=-1, le=64, description="-1은 깊이 제한 없음")
    min_child_samples: int = Field(20, ge=1)
    reg_lambda: float = Field(0.0, ge=0)
    n_jobs: int = Field(1, ge=1, le=128)

    @model_validator(mode="after")
    def depth_check(self):
        """LightGBM max_depth에서 0을 금지합니다."""
        if self.max_depth == 0:
            raise ValueError("max_depth는 -1 또는 양수여야 합니다")
        return self


class XGBoostParams(Strict):
    """XGBoostRanker 파라미터입니다."""
    n_estimators: int = Field(200, ge=1, le=10000)
    learning_rate: float = Field(0.05, gt=0, le=1)
    max_depth: int = Field(6, ge=1, le=64)
    min_child_weight: float = Field(1.0, ge=0)
    reg_lambda: float = Field(1.0, ge=0)
    n_jobs: int = Field(1, ge=1, le=128)


class CatBoostParams(Strict):
    """CatBoostRanker 파라미터입니다."""
    iterations: int = Field(200, ge=1, le=10000)
    learning_rate: float = Field(0.05, gt=0, le=1)
    depth: int = Field(6, ge=1, le=16)
    l2_leaf_reg: float = Field(3.0, ge=0)
    thread_count: int = Field(1, ge=1, le=128)


class RankNetParams(Strict):
    """RankNet 파라미터입니다."""
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
    """사용할 모델 이름과 모델별 params를 담습니다."""
    name: Literal["condition_score_baseline", "logistic_regression", "random_forest",
                  "lightgbm_ranker", "xgboost_ranker", "catboost_ranker", "ranknet"] = "lightgbm_ranker"
    params: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_params(self):
        """선택한 모델 이름에 맞는 params schema로 다시 검증합니다."""
        self.params = PARAM_SCHEMAS[self.name].model_validate(self.params).model_dump()
        return self


class UtilityParams(Strict):
    """합성 utility label을 계산할 때 쓰는 튜닝 파라미터입니다."""
    profile_share: float = Field(0.7, ge=0, le=1, description="장기 성향 비중. 나머지는 요청 가중치")
    distance_tolerance_ratio: float = Field(0.15, gt=0, le=1)
    slope_scale_pct: float = Field(8.0, gt=0, description="경사 만족도가 감소하는 척도 (%)")
    facility_scale_per_km: float = Field(1.0, gt=0)
    night_scale_per_km: float = Field(10.0, gt=0)
    flow_scale_per_km: float = Field(5.0, gt=0)
    requirement_violation_penalty: float = Field(0.25, ge=0, le=1)
    missing_satisfaction: float = Field(0.0, ge=0, le=1, description="측정 누락 시 만족도. 0은 보수적인 기본값")


class UtilityConfig(Strict):
    """합성 label 생성 방식과 relevance 변환 규칙입니다."""
    name: Literal["preference_v1"] = "preference_v1"
    version: str = Field("utility_v001", pattern=r"^[A-Za-z0-9_-]+$")
    params: UtilityParams = Field(default_factory=UtilityParams)
    relevance_levels: int = Field(5, ge=2, le=16, description="Utility [0,1]을 고정 폭 정수 등급으로 변환")
    tie_decimals: int = Field(8, ge=0, le=12)


class CandidatePolicy(Strict):
    """요청당 후보 수 부족/초과 처리 정책입니다."""
    minimum: int = Field(6, ge=2, le=100)
    target: int = Field(8, ge=2, le=100)
    maximum: int = Field(10, ge=2, le=100)
    shortage: Literal["exclude", "error"] = "exclude"
    excess: Literal["seeded_sample"] = "seeded_sample"
    retries: int = Field(1, ge=0, le=10, description="부족하면 방향 수를 늘려 같은 요청 재시도")

    @model_validator(mode="after")
    def ordered(self):
        """후보 수 정책이 minimum <= target <= maximum 순서를 지키는지 확인합니다."""
        if not self.minimum <= self.target <= self.maximum:
            raise ValueError("minimum <= target <= maximum 이어야 합니다")
        return self


class GenerationConfig(Strict):
    """routing-worker를 호출해 학습 데이터셋을 만드는 설정입니다."""

    # 설정 종류: 데이터셋 생성용 설정임을 표시
    kind: Literal["generation"] = "generation"
    # 설정 파일 스키마 버전
    schema_version: Literal[1] = 1
    # 생성할 데이터셋의 버전 이름
    version: str = Field("candidates_v001", pattern=r"^[A-Za-z0-9_-]+$")
    # 난수 고정값 (재현성 확보)
    seed: int = Field(42, ge=0, le=2147483647)
    # 사용자/요청 정보가 들어있는 원본 JSON 경로
    source_json: str = "datasets/runstop_users_1000_5000_requests.json"
    # 원본 데이터에 있어야 하는 예상 사용자 수
    expected_users: int = Field(1000, ge=1)
    # 원본 데이터에 있어야 하는 예상 요청 수
    expected_requests: int = Field(5000, ge=1)
    # 생성된 parquet, metadata 등을 저장할 폴더
    output_dir: str = "datasets/candidates_v001"
    # 실제 경로 생성 알고리즘(routing-worker) 프로젝트 위치
    routing_worker_dir: str = "../routing-worker"
    # worker 실행에 사용할 Python 인터프리터
    # 빈 문자열이면 현재 Python 사용
    worker_python: str = ""
    # DEM, 시설, 공원 등 routing 데이터가 있는 폴더
    data_root: str = "../routing-worker/src/algo/data"
    # 보행 그래프 GraphML 파일 위치
    graph_path: str = "../routing-worker/src/algo/data/서울_보행네트워크.graphml"
    # 동시에 사용할 worker 프로세스 수
    workers: int = Field(1, ge=1, le=64)
    # 후보 경로 생성 시 탐색할 방향 개수
    n_directions: int = Field(16, ge=1, le=360)
    # 전체 worker 실행의 최대 허용 시간(초)
    timeout_seconds: int = Field(
        86400,
        ge=1,
        description="전체 워커 실행 제한 시간",
    )
    # 특정 요청 처리 실패 시 제외할지 전체 오류로 처리할지
    request_error: Literal["exclude", "error"] = "exclude"
    # 요청당 후보 경로 개수 및 부족 시 처리 정책
    candidates: CandidatePolicy = Field(default_factory=CandidatePolicy)
    # Ground Truth Utility 계산 방법 설정
    utility: UtilityConfig = Field(default_factory=UtilityConfig)


class FeatureConfig(Strict):
    """모델 입력 feature 그룹 on/off 설정입니다."""
    # 사용자 프로필 feature 사용 여부
    use_profile: bool = True
    # 요청 자체의 feature 사용 여부
    use_request: bool = True
    # 화장실, 공원, 경사 제한 같은 요구조건 feature 사용 여부
    use_requirements: bool = True
    # 후보 경로에서 계산된 거리, 경사, 시설 등의 feature 사용 여부
    use_candidate_features: bool = True
    # 기존 routing-worker의 condition_score를 모델 입력으로 사용할지 여부
    use_condition_score: bool = False
    # 사용자 선택 이력 feature 사용 여부, 현재 데이터셋에는 이력이 없어 False 고정
    use_history: Literal[False] = False


class SplitConfig(Strict):
    """사용자 cold split과 사용자 내부 시간순 split 설정입니다."""
    # 사용자 단위 cold holdout + 사용자 내부 시간순 분할 전략
    strategy: Literal["user_temporal_holdout"] = "user_temporal_holdout"
    # 사용자 분할 시 사용하는 난수 고정값
    seed: int = Field(42, ge=0, le=2147483647)
    # 전체 사용자 중 cold test 사용자 비율
    cold_user_ratio: float = Field(0.2, gt=0, lt=1)
    # known 사용자별 validation에 사용할 마지막 요청 개수
    validation_requests: int = Field(1, ge=1)
    # known 사용자별 warm test에 사용할 마지막 요청 개수
    test_requests: int = Field(1, ge=1)
    # 한 사용자가 train에 최소한 가져야 하는 요청 개수
    min_train_requests: int = Field(1, ge=1)
    # 요청 수가 부족한 사용자를 제외할지 오류로 처리할지
    insufficient_user: Literal["exclude", "error"] = "exclude"


class EvaluationConfig(Strict):
    """평가 top-k와 bootstrap 신뢰구간 설정입니다."""
    # NDCG@K 등 랭킹 평가에서 사용할 K 값
    top_k: int = Field(3, ge=1, le=100)
    # bootstrap 신뢰구간 계산 반복 횟수, 0이면 bootstrap 미사용
    bootstrap_samples: int = Field(1000, ge=0, le=10000)
    # bootstrap 신뢰구간 수준
    confidence_level: float = Field(0.95, gt=0, lt=1)


class ExperimentConfig(Strict):
    """데이터셋, split, 모델, 평가 설정을 묶은 실험 설정입니다."""
    # 설정 종류: 모델 실험용 설정임을 표시
    kind: Literal["experiment"] = "experiment"
    # 실험 설정 스키마 버전
    schema_version: Literal[1] = 1
    # 실험 이름 및 artifact 식별용 이름
    name: str = Field("lightgbm_compare", pattern=r"^[A-Za-z0-9_-]+$")
    # 실험 전체 재현성을 위한 난수 고정값
    seed: int = Field(42, ge=0, le=2147483647)
    # 학습과 평가에 사용할 후보 데이터셋 parquet 경로
    dataset_path: str = "datasets/candidates_v001/candidates.parquet"
    # 데이터셋 생성 정보와 버전 등을 담은 metadata 경로
    metadata_path: str = "datasets/candidates_v001/metadata.json"
    # 어떤 feature 그룹을 모델 입력으로 사용할지 설정
    features: FeatureConfig = Field(default_factory=FeatureConfig)
    # train/validation/warm test/cold test 분할 설정
    split: SplitConfig = Field(default_factory=SplitConfig)
    # 사용할 모델 종류와 모델별 파라미터 설정
    model: ModelConfig = Field(default_factory=ModelConfig)
    # 평가 지표의 top-k와 신뢰구간 계산 설정
    evaluation: EvaluationConfig = Field(default_factory=EvaluationConfig)
    # 실험 결과, 모델, metric 등을 저장할 폴더
    output_dir: str = "artifacts"


def validate_config(data):
    """dict의 kind 값을 보고 GenerationConfig 또는 ExperimentConfig로 검증합니다."""
    if not isinstance(data, dict) or data.get("kind") not in {"generation", "experiment"}:
        raise ValueError("kind: generation 또는 experiment가 필요합니다 (schema_version: 1)")
    cls = GenerationConfig if data["kind"] == "generation" else ExperimentConfig
    return cls.model_validate(data)
