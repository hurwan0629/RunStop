"""저장된 모델과 학습 당시 분할표로 Warm/Cold Test만 평가한다."""
import json
from pathlib import Path
import traceback

import pandas as pd

from ai.src.config.loader import load_config, resolve_path
from ai.src.config.schema import ExperimentConfig
from ai.src.dataset.loader import load_dataset
from ai.src.dataset.splits import assert_no_leakage
from ai.src.models.base import BaseRankingModel
from ai.src.experiment.artifacts import begin_run, finish_run, sha256_file, write_json
from ai.src.experiment.evaluator import save_evaluation
from ai.src.experiment.resources import ResourceMonitor


def evaluate_saved_model(artifact: str | Path):
    artifact = Path(artifact).resolve()
    manifest = json.loads((artifact / "manifest.json").read_text(encoding="utf-8"))
    # stage 없는 기존 통합 실험 artifact도 읽을 수 있다.
    if manifest.get("status") != "complete" or manifest.get("stage") not in (None, "train"):
        raise ValueError("A complete training artifact is required")
    for name in ("config.yaml", "dataset_reference.json", "split_assignments.parquet",
                 "model/model.pkl", "model/input_schema.json"):
        expected = manifest.get("files", {}).get(name, {}).get("sha256")
        if not expected or sha256_file(artifact / name) != expected:
            raise ValueError(f"Training artifact hash mismatch: {name}")
    config = load_config(artifact / "config.yaml")
    if not isinstance(config, ExperimentConfig):
        raise ValueError("Training artifact requires an experiment YAML")
    reference = json.loads((artifact / "dataset_reference.json").read_text(encoding="utf-8"))

    print("[1/3] Verify original dataset and restore saved splits", flush=True)
    df, _, dataset_hash = load_dataset(resolve_path(config.dataset_path), resolve_path(config.metadata_path))
    if (dataset_hash != reference["sha256"]
            or sha256_file(resolve_path(config.metadata_path)) != reference["metadata_sha256"]):
        raise ValueError("Dataset differs from the training snapshot")
    assignments = pd.read_parquet(artifact / "split_assignments.parquet")
    keys = ["user_id", "request_id", "request_sequence"]
    requests = df[keys].drop_duplicates()
    joined = requests.merge(assignments, on=keys, how="outer", validate="one_to_one", indicator=True)
    split_names = ("train", "validation", "warm_start", "cold_start")
    if (not joined["_merge"].eq("both").all()
            or assignments.request_id.duplicated().any()
            or not assignments["split"].isin((*split_names, "excluded")).all()):
        raise ValueError("Saved split assignments do not match the dataset")
    parts = {
        name: df[df.request_id.isin(assignments.loc[assignments["split"] == name, "request_id"])].copy()
        for name in split_names
    }
    if any(frame.empty for frame in parts.values()):
        raise ValueError("Saved split assignments contain an empty split")
    assert_no_leakage(parts)

    model = BaseRankingModel.load(artifact / "model")
    if model.name != config.model.name:
        raise ValueError("Saved model differs from the training configuration")
    path, result_manifest = begin_run(artifact.parent, config, "test")
    log = path / "run.log"
    log.write_text("Test started\n", encoding="utf-8")
    try:
        write_json(path / "training_reference.json", {
            "artifact": str(artifact), "manifest_sha256": sha256_file(artifact / "manifest.json"),
            "model_sha256": sha256_file(artifact / "model" / "model.pkl"),
            "split_sha256": sha256_file(artifact / "split_assignments.parquet"),
        })
        write_json(path / "dataset_reference.json", reference)
        print("[2/3] Evaluate saved model on warm/cold test (no fitting)", flush=True)
        with ResourceMonitor() as monitor:
            inference = save_evaluation(
                model, {name: parts[name] for name in ("warm_start", "cold_start")}, config, path,
            )
        write_json(path / "resource_usage.json", {**monitor.result, **inference})
        print("[3/3] Save test metrics and predictions", flush=True)
        log.write_text("Test completed; model and training artifact unchanged\n", encoding="utf-8")
        finish_run(path, result_manifest)
    except Exception as exc:
        log.write_text(traceback.format_exc(), encoding="utf-8")
        finish_run(path, result_manifest, exc)
        raise RuntimeError(f"Test failed; details: {log}") from exc
    return path
