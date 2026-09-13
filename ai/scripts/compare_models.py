import argparse
import json
from pathlib import Path
import _bootstrap
from ai.src.experiment.artifacts import sha256_file


def compare(paths):
    reference = None
    rows = []
    for path in map(Path, paths):
        manifest = json.loads((path / "manifest.json").read_text(encoding="utf-8"))
        if manifest["status"] != "complete":
            raise ValueError(f"Incomplete artifact: {path}")
        dataset = json.loads((path / "dataset_reference.json").read_text(encoding="utf-8"))
        import yaml
        config = yaml.safe_load((path / "config.yaml").read_text(encoding="utf-8"))
        protocol = (dataset["sha256"], dataset["metadata_sha256"], sha256_file(path / "split_assignments.parquet"), config["evaluation"])
        if reference is not None and protocol != reference:
            raise ValueError("Datasets, labels, splits or evaluation protocols differ; direct comparison refused")
        reference = protocol
        metrics = json.loads((path / "metrics.json").read_text(encoding="utf-8"))
        resources = json.loads((path / "resource_usage.json").read_text(encoding="utf-8"))
        ndcg = f"ndcg@{config['evaluation']['top_k']}"
        rows.append({"run": path.name, "model": manifest["model"], ndcg: metrics["overall"]["model"][ndcg]["mean"],
                     "warm": metrics["warm_start"]["model"][ndcg]["mean"], "cold": metrics["cold_start"]["model"][ndcg]["mean"],
                     "inference_ms": resources["inference_ms_per_request"], "model_bytes": resources["model_bundle_bytes"]})
    return rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("artifacts", nargs="+")
    args = parser.parse_args()
    print(json.dumps(compare(args.artifacts), ensure_ascii=False, indent=2))
