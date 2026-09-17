"""YAML 하나로 Train 학습과 Validation 평가를 실행한다."""
import time
import traceback

from ai.src.config.loader import resolve_path
from ai.src.config.schema import ExperimentConfig
from ai.src.dataset.loader import load_dataset
from ai.src.dataset.features import select_feature_columns
from ai.src.dataset.splits import split_user_temporal_holdout
from ai.src.models.registry import create_model
from ai.src.experiment.artifacts import begin_run, finish_run, write_json, sha256_file
from ai.src.experiment.evaluator import save_evaluation
from ai.src.experiment.resources import ResourceMonitor


def train_model(config: ExperimentConfig):
    path, manifest = begin_run(resolve_path(config.output_dir), config, "train")
    log = path / "run.log"
    log.write_text("Training started\n", encoding="utf-8")
    try:
        print("[1/4] Load dataset and reserve validation/test splits", flush=True)
        dataset_path = resolve_path(config.dataset_path)
        metadata_path = resolve_path(config.metadata_path)
        df, metadata, dataset_hash = load_dataset(dataset_path, metadata_path)
        write_json(path / "dataset_reference.json", {
            "path": str(dataset_path), "sha256": dataset_hash,
            "metadata_path": str(metadata_path),
            "metadata_sha256": sha256_file(metadata_path), "metadata": metadata,
        })
        parts, assignments = split_user_temporal_holdout(df, config.split)
        assignments.sort_values(["user_id", "request_sequence", "request_id"]).to_parquet(
            path / "split_assignments.parquet", index=False,
        )
        columns = (["condition_score"] if config.model.name == "condition_score_baseline"
                   else select_feature_columns(parts["train"], config.features))
        model = create_model(config.model, columns, config.seed)

        with ResourceMonitor() as monitor:
            print("[2/4] Fit model on train (validation for model diagnostics)", flush=True)
            started = time.perf_counter()
            model.fit(parts["train"], parts["validation"])
            train_seconds = time.perf_counter() - started
            print("[3/4] Evaluate validation only", flush=True)
            inference = save_evaluation(
                model, {"validation": parts["validation"]}, config, path / "validation",
            )

        print("[4/4] Save model, validation metrics and training records", flush=True)
        model.save(path / "model")
        write_json(path / "resource_usage.json", {
            **monitor.result, **inference, "train_seconds": train_seconds,
            "model_bundle_bytes": (path / "model" / "model.pkl").stat().st_size,
        })
        (path / "diagnostics").mkdir()
        write_json(path / "diagnostics" / "training_history.json", model.history)
        importance = model.feature_importance()
        if importance is not None:
            write_json(path / "diagnostics" / "feature_importance.json", importance)
        write_json(path / "diagnostics" / "split_summary.json", assignments.groupby("split").size().to_dict())
        log.write_text("Training and validation completed; test not evaluated\n", encoding="utf-8")
        finish_run(path, manifest)
    except Exception as exc:
        log.write_text(traceback.format_exc(), encoding="utf-8")
        finish_run(path, manifest, exc)
        raise RuntimeError(f"Training failed; details: {log}") from exc
    return path
