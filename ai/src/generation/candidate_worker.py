"""This file runs in a separate routing Python process, avoiding ai/src import conflicts.

No third-party imports at module load: --check and the editor never load spatial data.
"""
import argparse
import contextlib
import hashlib
import importlib.util
import json
import os
import random
import sys
import types
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

_GRAPH = _INDEX = _RECOMMEND = _CONFIG = None


def spatial_paths(config):
    root = Path(config["data_root"])
    dem = root / "배포" if (root / "배포").is_dir() else root
    facility = root / "배포" / "서울_시설데이터_통합.csv"
    if not facility.is_file():
        facility = root / "서울_시설데이터_통합.csv"
    return [Path(config["graph_path"]), dem / "query_elevation.py", dem / "서울_DEM_10m.npy",
            dem / "서울_DEM_10m_meta.json", facility,
            root / "osm" / "out" / "서울_공원.geojson", root / "osm" / "out" / "서울_하천_polygon.geojson"]


def preflight(config):
    paths = [Path(config["routing_worker_dir"]) / "src" / "algo" / "pipeline.py", *spatial_paths(config)]
    return [str(p) for p in paths if not p.is_file()]


def initialize(config):
    global _GRAPH, _INDEX, _RECOMMEND, _CONFIG
    missing = preflight(config)
    if missing:
        raise FileNotFoundError("Missing routing data:\n" + "\n".join(missing))
    _CONFIG = config
    sys.path.insert(0, config["routing_worker_dir"])
    os.environ["RUNSTOP_DATA_DIR"] = config["data_root"]
    # Adapt the worker's fixed src.algo.data.query_elevation import without editing worker code.
    import src.algo
    data_package = types.ModuleType("src.algo.data")
    data_package.__path__ = [str(spatial_paths(config)[1].parent)]
    sys.modules["src.algo.data"] = data_package
    spec = importlib.util.spec_from_file_location("src.algo.data.query_elevation", spatial_paths(config)[1])
    elevation = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = elevation
    spec.loader.exec_module(elevation)
    with contextlib.redirect_stdout(sys.stderr):
        from src.algo.pipeline import recommend
        from src.algo.utils.graph import load_graphml, NodeIndex
        # Read graph directly: experiments must not write caches alongside routing-worker data.
        _GRAPH = load_graphml(config["graph_path"])
        _INDEX = NodeIndex(_GRAPH)
    _RECOMMEND = recommend


def candidate_identity(candidate):
    encoded = json.dumps(candidate.get("coords"), separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(encoded.encode()).hexdigest()


def select_pool(candidates, policy, seed, request_id):
    unique = {candidate_identity(c): c for c in candidates}
    identities = sorted(unique)
    if len(identities) > policy["maximum"]:
        rng = random.Random(f"{seed}:{request_id}")
        identities = sorted(rng.sample(identities, policy["maximum"]))
    return [{**unique[key], "candidate_id": key[:24]} for key in identities]


def run_job(job):
    policy = _CONFIG["candidates"]
    try:
        pool = []
        attempts = 0
        for attempt in range(policy["retries"] + 1):
            attempts += 1
            with contextlib.redirect_stdout(sys.stderr):
                candidates = _RECOMMEND(_GRAPH, _INDEX, **job["args"],
                                        n_directions=_CONFIG["n_directions"] * (attempt + 1),
                                        top_k=1000000)
            pool = select_pool(pool + candidates, policy, _CONFIG["seed"], job["request_id"])
            if len(pool) >= policy["target"]:
                break
        if len(pool) < policy["minimum"]:
            return {"request_id": job["request_id"], "status": "shortage", "count": len(pool), "attempts": attempts,
                    "error": f"only {len(pool)} candidates; minimum {policy['minimum']}"}
        return {"request_id": job["request_id"], "status": "ok", "attempts": attempts, "candidates": pool}
    except Exception as exc:
        return {"request_id": job["request_id"], "status": "error", "error": f"{type(exc).__name__}: {exc}"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--jobs", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    jobs = json.loads(Path(args.jobs).read_text(encoding="utf-8"))
    missing = preflight(config)
    if missing:
        raise FileNotFoundError("Missing routing data:\n" + "\n".join(missing))
    with Path(args.output).open("x", encoding="utf-8") as stream:
        with ProcessPoolExecutor(max_workers=config["workers"], initializer=initialize, initargs=(config,)) as executor:
            for index, result in enumerate(executor.map(run_job, jobs, chunksize=1), 1):
                stream.write(json.dumps(result, ensure_ascii=False, allow_nan=False) + "\n")
                stream.flush()
                if index % 25 == 0 or index == len(jobs):
                    print(f"Routing {index}/{len(jobs)}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
