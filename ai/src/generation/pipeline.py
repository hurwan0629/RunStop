"""Explicit CLI-only generation. The editor can validate configuration but cannot invoke this."""
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from ai.src.config.loader import resolve_path, dump_config
from ai.src.generation.user_sampler import load_users
from ai.src.generation.request_sampler import normalize_requests, request_features
from ai.src.generation.candidate_worker import preflight, spatial_paths
from ai.src.experiment.artifacts import write_json, sha256_file, environment_snapshot


def resolved_worker_config(config):
    result = config.model_dump()
    for key in ("routing_worker_dir", "data_root", "graph_path"):
        result[key] = str(resolve_path(result[key]))
    return result


def inspect_generation(config):
    users = load_users(resolve_path(config.source_json), config.expected_users, config.expected_requests)
    jobs = normalize_requests(users)
    return {"users": len(users), "requests": len(jobs), "request_order": "JSON array order (not observed timestamps)",
            "missing_spatial_files": preflight(resolved_worker_config(config)),
            "output_exists": resolve_path(config.output_dir).exists()}


def generate_dataset(config):
    import pandas as pd
    from ai.src.dataset.schema import flatten_candidate, validate_dataset
    from ai.src.generation.utility import label_candidates
    source = resolve_path(config.source_json)
    users = load_users(source, config.expected_users, config.expected_requests)
    jobs = normalize_requests(users)
    worker_config = resolved_worker_config(config)
    missing = preflight(worker_config)
    if missing:
        raise FileNotFoundError("공간 데이터가 없습니다. 생성하지 않았습니다:\n" + "\n".join(missing))
    output = resolve_path(config.output_dir)
    output.mkdir(parents=True, exist_ok=False)
    metadata = {"schema_version": 1, "status": "running", "version": config.version, "seed": config.seed,
                "source_json": str(source), "source_sha256": sha256_file(source),
                "source_users": len(users), "source_requests": len(jobs),
                "utility": config.utility.model_dump(), "request_order": "JSON array order, assumed chronology",
                "created_at": datetime.now(timezone.utc).isoformat(), "generation_config": config.model_dump()}
    write_json(output / "metadata.json", metadata)
    (output / "config.yaml").write_text(dump_config(config), encoding="utf-8")
    try:
        spatial = {str(p): sha256_file(p) for p in spatial_paths(worker_config)}
        metadata["spatial_files_sha256"] = spatial
        metadata["environment"] = environment_snapshot()
        worker_code = Path(worker_config["routing_worker_dir"]) / "src" / "algo"
        metadata["routing_source_sha256"] = {p.relative_to(worker_code).as_posix(): sha256_file(p) for p in sorted(worker_code.rglob("*.py")) if "data" not in p.relative_to(worker_code).parts}
        with tempfile.TemporaryDirectory(prefix="runstop-routing-") as temporary:
            temp = Path(temporary)
            write_json(temp / "config.json", worker_config)
            write_json(temp / "jobs.json", jobs)
            executable = str(resolve_path(config.worker_python)) if config.worker_python else sys.executable
            command = [executable, str(Path(__file__).with_name("candidate_worker.py")), "--config", str(temp / "config.json"),
                       "--jobs", str(temp / "jobs.json"), "--output", str(temp / "results.jsonl")]
            # Worker progress/logs go directly to console; raw coordinate responses stay in a temporary file.
            run_worker(command, worker_config["routing_worker_dir"], config.timeout_seconds)
            indexed = {job["request_id"]: job for job in jobs}
            rows, failures, observed, attempts = [], [], set(), {}
            with (temp / "results.jsonl").open(encoding="utf-8") as stream:
                for line in stream:
                    result = json.loads(line)
                    rid = result["request_id"]
                    if rid not in indexed or rid in observed:
                        raise ValueError("Worker returned an unknown/duplicate request")
                    observed.add(rid)
                    attempts[rid] = result.get("attempts", 0)
                    if result["status"] != "ok":
                        failures.append(result)
                        fatal = config.candidates.shortage == "error" if result["status"] == "shortage" else config.request_error == "error"
                        if fatal:
                            write_json(output / "failures.json", failures)
                            raise ValueError(f"{rid}: {result['error']}")
                        continue
                    job = indexed[rid]
                    labels = label_candidates(result["candidates"], job, config.utility)
                    for candidate, label in zip(result["candidates"], labels):
                        rows.append({**request_features(job), **flatten_candidate(candidate), **label, "candidate_id": candidate["candidate_id"]})
            if observed != set(indexed):
                raise ValueError("Worker omitted requests")
        frame = validate_dataset(pd.DataFrame(rows), config.utility.relevance_levels)
        counts = frame.groupby("request_id").size()
        if not counts.between(config.candidates.minimum, config.candidates.maximum).all():
            raise ValueError("Candidate counts violate generation policy")
        frame.to_parquet(output / "candidates.parquet", index=False)
        pd.DataFrame([request_features(job) for job in jobs]).to_parquet(output / "requests.parquet", index=False)
        pd.DataFrame([{"user_id": u["user_id"], "profile_json": json.dumps(u["profile"], ensure_ascii=False)} for u in users]).to_parquet(output / "users.parquet", index=False)
        write_json(output / "failures.json", failures)
        metadata.update(status="complete", candidates_sha256=sha256_file(output / "candidates.parquet"),
                        candidate_rows=len(frame), valid_requests=int(counts.size), failed_requests=len(failures),
                        candidate_count_stats={"min": int(counts.min()), "max": int(counts.max()), "mean": float(counts.mean())},
                        attempts=attempts)
        write_json(output / "metadata.json", metadata)
    except Exception as exc:
        metadata.update(status="failed", error=f"{type(exc).__name__}: {exc}")
        write_json(output / "metadata.json", metadata)
        raise
    return output


def run_worker(command, cwd, timeout):
    """On timeout/interruption stop the launched process tree, including Windows pool children."""
    import psutil
    process = subprocess.Popen(command, cwd=cwd)
    try:
        returncode = process.wait(timeout=timeout)
        if returncode:
            raise subprocess.CalledProcessError(returncode, command)
    except (subprocess.TimeoutExpired, KeyboardInterrupt):
        try:
            children = psutil.Process(process.pid).children(recursive=True)
        except psutil.NoSuchProcess:
            children = []
        for child in children:
            try:
                child.kill()
            except psutil.NoSuchProcess:
                pass
        if process.poll() is None:
            process.kill()
        process.wait()
        psutil.wait_procs(children, timeout=5)
        raise
