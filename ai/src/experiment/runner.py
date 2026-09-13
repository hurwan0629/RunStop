import json
import time
import traceback
from ai.src.config.loader import resolve_path
from ai.src.config.schema import ExperimentConfig
from ai.src.dataset.loader import load_dataset
from ai.src.dataset.features import select_feature_columns
from ai.src.dataset.splits import split_user_temporal_holdout
from ai.src.models.registry import create_model
from ai.src.evaluation.evaluator import evaluate
from ai.src.monitoring.resources import ResourceMonitor
from ai.src.experiment.artifacts import begin_run, finish_run, write_json, sha256_file
from ai.src.visualization.plots import plot_metrics


def run_experiment(config: ExperimentConfig):
    path, manifest = begin_run(resolve_path(config.output_dir), config)
    log = path / "run.log"
    log.write_text("Experiment started\n", encoding="utf-8")
    try:
        dataset_path, metadata_path = resolve_path(config.dataset_path), resolve_path(config.metadata_path)
        df, metadata, dataset_hash = load_dataset(dataset_path, metadata_path)
        write_json(path / "dataset_reference.json", {"path": str(dataset_path), "sha256": dataset_hash,
                   "metadata_path": str(metadata_path), "metadata_sha256": sha256_file(metadata_path), "metadata": metadata})
        parts, assignments = split_user_temporal_holdout(df, config.split)
        assignments = assignments.sort_values(["user_id", "request_sequence", "request_id"])
        assignments.to_parquet(path / "split_assignments.parquet", index=False)
        columns = ["condition_score"] if config.model.name == "condition_score_baseline" else select_feature_columns(df, config.features)
        model = create_model(config.model, columns, config.seed)
        with ResourceMonitor() as monitor:
            started = time.perf_counter()
            model.fit(parts["train"], parts["validation"])
            train_seconds = time.perf_counter() - started
            predictions, per_request, metrics, inference = evaluate(model, parts, config.evaluation, config.seed)
        model.save(path / "model")
        predictions.to_parquet(path / "predictions.parquet", index=False)
        per_request.to_parquet(path / "request_metrics.parquet", index=False)
        write_json(path / "metrics.json", metrics)
        write_json(path / "resource_usage.json", {**monitor.result, **inference, "train_seconds": train_seconds,
                   "model_bundle_bytes": (path / "model" / "model.pkl").stat().st_size})
        (path / "diagnostics").mkdir()
        write_json(path / "diagnostics" / "training_history.json", model.history)
        importance = model.feature_importance()
        if importance is not None:
            write_json(path / "diagnostics" / "feature_importance.json", importance)
        write_json(path / "diagnostics" / "split_summary.json", assignments.groupby("split").size().to_dict())
        plot_metrics(metrics, path / "plots", config.evaluation.top_k)
        log.write_text("Experiment completed\n", encoding="utf-8")
        finish_run(path, manifest)
    except Exception as exc:
        log.write_text(traceback.format_exc(), encoding="utf-8")
        finish_run(path, manifest, exc)
        raise RuntimeError(f"Experiment failed; details: {log}") from exc
    return path
