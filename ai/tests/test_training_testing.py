"""학습은 Val까지만 평가하고, Test는 저장된 모델/분할을 그대로 사용해야 한다."""
import json
from pathlib import Path
import subprocess
import sys

import pandas as pd
import pytest

from ai.src.config.loader import dump_config
from ai.src.config.schema import ExperimentConfig, ModelConfig, EvaluationConfig, UtilityConfig
from ai.src.dataset.splits import split_user_temporal_holdout
from ai.src.experiment.artifacts import sha256_file, write_json
from ai.src.experiment.training import train_model
from ai.src.experiment.testing import evaluate_saved_model
from ai.src.models.implementations.condition_score_baseline import ConditionScoreBaseline


@pytest.fixture
def training_config(candidates, tmp_path):
    dataset = tmp_path / "candidates.parquet"
    metadata = tmp_path / "metadata.json"
    candidates.to_parquet(dataset, index=False)
    write_json(metadata, {
        "schema_version": 1, "status": "complete", "version": "test",
        "utility": UtilityConfig().model_dump(), "candidates_sha256": sha256_file(dataset),
    })
    return ExperimentConfig(
        dataset_path=str(dataset), metadata_path=str(metadata), output_dir=str(tmp_path / "runs"),
        model=ModelConfig(name="condition_score_baseline"),
        evaluation=EvaluationConfig(bootstrap_samples=0),
    )


def test_train_val_isolation_and_test_never_fits(candidates, training_config, monkeypatch):
    parts, _ = split_user_temporal_holdout(candidates, training_config.split)
    original_fit = ConditionScoreBaseline.fit
    original_predict = ConditionScoreBaseline.predict_scores
    predicted = set()

    def checked_fit(self, train, validation):
        assert set(train.request_id) == set(parts["train"].request_id)
        assert set(validation.request_id) == set(parts["validation"].request_id)
        return original_fit(self, train, validation)

    def tracked_predict(self, frame):
        predicted.update(frame.request_id)
        return original_predict(self, frame)

    monkeypatch.setattr(ConditionScoreBaseline, "fit", checked_fit)
    monkeypatch.setattr(ConditionScoreBaseline, "predict_scores", tracked_predict)
    run = train_model(training_config)
    assert predicted == set(parts["validation"].request_id)
    metrics = json.loads((run / "validation/metrics.json").read_text())
    assert set(metrics) == {"overall", "validation"}
    assert not (run / "metrics.json").exists()
    assert set(pd.read_parquet(run / "validation/predictions.parquet").request_id) == predicted

    def forbidden(*args, **kwargs):
        raise AssertionError("Testing must not fit or regenerate splits")

    monkeypatch.setattr(ConditionScoreBaseline, "fit", forbidden)
    monkeypatch.setattr("ai.src.dataset.splits.split_user_temporal_holdout", forbidden)
    original_files = {p.relative_to(run): sha256_file(p) for p in run.rglob("*") if p.is_file()}
    predicted.clear()
    result = evaluate_saved_model(run)
    expected_ids = set(parts["warm_start"].request_id) | set(parts["cold_start"].request_id)
    assert predicted == expected_ids
    assert set(pd.read_parquet(result / "predictions.parquet").request_id) == expected_ids
    assert set(json.loads((result / "metrics.json").read_text())) == {"overall", "warm_start", "cold_start"}
    assert not (result / "model").exists()
    assert original_files == {p.relative_to(run): sha256_file(p) for p in run.rglob("*") if p.is_file()}

    # 이전 통합 실험의 manifest는 stage가 없었다. 같은 번들로 재평가할 수 있다.
    manifest = json.loads((run / "manifest.json").read_text())
    manifest.pop("stage")
    write_json(run / "manifest.json", manifest)
    again = evaluate_saved_model(run)
    assert again != result
    assert json.loads((again / "metrics.json").read_text()) == json.loads((result / "metrics.json").read_text())


@pytest.mark.parametrize("changed", ["dataset", "split", "model", "status"])
def test_test_rejects_changed_training_inputs(training_config, changed):
    run = train_model(training_config)
    if changed == "dataset":
        # 자체 metadata와는 일치하지만 학습 당시와 달라진 데이터셋.
        dataset = Path(training_config.dataset_path)
        df = pd.read_parquet(dataset)
        df["condition_score"] += 1
        df.to_parquet(dataset, index=False)
        metadata = json.loads(Path(training_config.metadata_path).read_text())
        metadata["candidates_sha256"] = sha256_file(dataset)
        write_json(training_config.metadata_path, metadata)
    elif changed in ("split", "model"):
        target = run / ("split_assignments.parquet" if changed == "split" else "model/model.pkl")
        target.write_bytes(target.read_bytes() + b"changed")
    else:
        manifest = json.loads((run / "manifest.json").read_text())
        manifest["status"] = "failed"
        write_json(run / "manifest.json", manifest)
    with pytest.raises(ValueError):
        evaluate_saved_model(run)


def test_train_and_test_cli(training_config, tmp_path):
    root = Path(__file__).resolve().parents[2]
    config = tmp_path / "experiment.yaml"
    config.write_text(dump_config(training_config), encoding="utf-8")
    for arguments in (["--config", str(config), "--validate-only"], ["--config", str(config)]):
        subprocess.run([sys.executable, str(root / "ai/scripts/train.py"), *arguments],
                       cwd=tmp_path, check=True, capture_output=True, text=True)
    run, = Path(training_config.output_dir).iterdir()
    subprocess.run([sys.executable, str(root / "ai/scripts/test.py"), "--artifact", str(run)],
                   cwd=tmp_path, check=True, capture_output=True, text=True)
    assert len(list(Path(training_config.output_dir).iterdir())) == 2
