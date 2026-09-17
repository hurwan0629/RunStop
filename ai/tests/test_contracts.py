import copy
import json
import sys
import numpy as np
import pytest
from pydantic import ValidationError
from ai.src.config.schema import ExperimentConfig, GenerationConfig, ModelConfig, UtilityConfig, SplitConfig, FeatureConfig
from ai.src.config.loader import load_config, dump_config, AI_ROOT
from ai.src.dataset.schema import validate_dataset
from ai.src.dataset.features import select_feature_columns
from ai.src.dataset.splits import split_user_temporal_holdout
from ai.src.generation.request_sampler import normalize_requests
from ai.src.generation.user_sampler import load_users
from ai.src.generation.utility import utility_score, label_candidates
from ai.src.generation.candidate_worker import select_pool
from ai.src.experiment.metrics import ndcg_at_k, request_metrics, confidence_interval


def test_configs_validate_params_and_roundtrip(tmp_path):
    for name in ("condition_score_baseline", "logistic_regression", "random_forest", "lightgbm_ranker", "xgboost_ranker", "catboost_ranker", "ranknet"):
        config = ExperimentConfig(model=ModelConfig(name=name))
        path = tmp_path / f"{name}.yaml"
        path.write_text(dump_config(config), encoding="utf-8")
        assert load_config(path) == config
    for invalid in ({"name": "imaginary"}, {"name": "lightgbm_ranker", "params": {"C": 1.0}},
                    {"name": "ranknet", "params": {"depth": 0}}, {"name": "ranknet", "params": {"epochs": 0}}, {"name": "lightgbm_ranker", "params": {"learning_rate": float('nan')}}):
        with pytest.raises(ValidationError):
            ModelConfig.model_validate(invalid)
    with pytest.raises(ValidationError):
        GenerationConfig.model_validate({"candidates": {"minimum": 10, "target": 8}})
    with pytest.raises(ValidationError):
        FeatureConfig(use_history=True)


def test_supplied_json_read_only():
    path = AI_ROOT / "datasets/runstop_users_1000_5000_requests.json"
    if not path.exists():
        pytest.skip("Source JSON not present")
    users = load_users(path, 1000, 5000)
    jobs = normalize_requests(users)
    assert len(jobs) == 5000
    assert len({job["request_id"] for job in jobs}) == 5000
    assert all(job["args"]["end"] is not None for job in jobs if job["args"]["route_type"] == "ONE_WAY")
    assert "src.algo.pipeline" not in sys.modules


def test_request_schemas_equivalent_and_reject_invalid():
    base = {"user_id": "u1", "profile": {"weights": {"distance": 5}}}
    old = {"route_type": "ONE_WAY", "start": [37.5, 127.0], "end": [37.51,127.01], "target_km": 3.0, "requirements": {"no_stairs": True}}
    new = {"routeType": "ONE_WAY", "startPoint": {"lat":37.5,"lng":127.0}, "endPoint":{"lat":37.51,"lng":127.01},
           "elementConditions": {"targetDistance":3000, "weights":{"distance":5}, "requirements":{"no_stairs":True}}}
    assert normalize_requests([{**base, "requests": [old]}]) == normalize_requests([{**base, "requests": [new]}])
    for changed in ({**old, "end": None}, {**old, "start": [200,0]}, {**old, "requirements":{"no_stairs":1}}):
        with pytest.raises(ValueError):
            normalize_requests([{**base,"requests":[changed]}])


def test_utility_independent_of_baseline_and_monotonic():
    cfg = UtilityConfig()
    job = {"profile":{"weights":{"distance":5}}, "args":{"target_km":3,"weights":{"distance":5},"requirements":{}}}
    good = {"actual_distance_m":3000,"condition_score":0}
    poor = {"actual_distance_m":5000,"condition_score":100}
    assert utility_score(good, job["profile"]["weights"], job["args"], cfg) > utility_score(poor, job["profile"]["weights"], job["args"], cfg)
    assert label_candidates([good, {**good,"condition_score":100},poor],job,cfg)[0] == label_candidates([good,good,poor],job,cfg)[1]
    labels = label_candidates([good,good,poor],job,cfg)
    assert [x["ground_truth_rank"] for x in labels] == [1,1,2]
    constrained = {**job["args"],"requirements":{"max_slope_pct":0}}
    assert utility_score(good,job["profile"]["weights"],constrained,cfg) < 1


def test_dataset_contract_and_features(candidates):
    validate_dataset(candidates)
    features = select_feature_columns(candidates, FeatureConfig())
    assert not set(features) & {"candidate_id","request_id","user_id","utility","relevance","ground_truth_rank","condition_score"}
    invalid = candidates.copy()
    invalid.loc[0, "ground_truth_rank"] = 1
    with pytest.raises(ValueError):
        validate_dataset(invalid)
    with pytest.raises(ValueError):
        validate_dataset(candidates.iloc[[0]])


def test_split_request_integrity_and_reproducibility(candidates):
    config = SplitConfig()
    parts, assignments = split_user_temporal_holdout(candidates, config)
    _, again = split_user_temporal_holdout(candidates.sample(frac=1,random_state=4),config)
    assert assignments.set_index('request_id').split.to_dict() == again.set_index('request_id').split.to_dict()
    assert not set(parts['train'].user_id) & set(parts['cold_start'].user_id)
    for part in parts.values():
        assert (part.groupby('request_id').size() == candidates[candidates.request_id.isin(part.request_id)].groupby('request_id').size()).all()
    assert set(parts['train'].request_sequence) == {1,2,3}
    assert set(parts['validation'].request_sequence) == {4}
    assert set(parts['warm_start'].request_sequence) == {5}


def test_short_users_explicitly_excluded(candidates):
    # Remove requests for all users; there is no valid train/validation/warm partition left.
    with pytest.raises(ValueError, match='empty'):
        split_user_temporal_holdout(candidates[candidates.request_sequence <= 2], SplitConfig())


def test_metrics_known_answers():
    assert ndcg_at_k([4,3,2,1],3) == pytest.approx(1)
    assert ndcg_at_k([0,0,0],3) == 0
    assert ndcg_at_k([0,0,1],2) == 0
    metrics = request_metrics([.1,.5,.9],[0,2,4],3)
    assert metrics['pairwise_accuracy'] == 0
    assert metrics['utility_regret'] == pytest.approx(.8)
    assert request_metrics([.5,.5],[2,2],3)['pairwise_accuracy'] is None


def test_pool_caps_reproducible_without_score_bias():
    pool = [{"coords":[[37+i/1000,127],[37.1,127.1]],"condition_score":i} for i in range(20)]
    policy = {"maximum":10}
    a = select_pool(pool,policy,42,'r1')
    b = select_pool(list(reversed(pool)),policy,42,'r1')
    assert [c['candidate_id'] for c in a] == [c['candidate_id'] for c in b]
    assert len(a) == 10
    assert len(select_pool(pool[:6],policy,42,'r1')) == 6
