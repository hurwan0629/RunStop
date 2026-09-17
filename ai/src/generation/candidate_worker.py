"""ai/src import 충돌을 피하려고 별도 routing Python 프로세스에서 실행되는 worker입니다.

모듈 로드 시점에는 외부 공간 데이터 의존성을 import하지 않습니다.
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
from typing import Any

# 각 worker 프로세스에서 한 번만 초기화해 재사용할 전역 객체
_GRAPH = _INDEX = _RECOMMEND = _CONFIG = None


def spatial_paths(config: dict[str, Any]) -> list[Path]:
    """routing-worker 실행에 필요한 공간 데이터 파일 경로 목록을 만듭니다."""

    root = Path(config["data_root"])

    # DEM 파일이 배포 하위 폴더에 있으면 그쪽을 우선 사용
    dem = root / "배포" if (root / "배포").is_dir() else root

    # 시설 데이터도 배포 폴더 우선, 없으면 root 직접 사용
    facility = root / "배포" / "서울_시설데이터_통합.csv"
    if not facility.is_file():
        facility = root / "서울_시설데이터_통합.csv"

    return [Path(config["graph_path"]), dem / "query_elevation.py", dem / "서울_DEM_10m.npy", dem / "서울_DEM_10m_meta.json", facility, root / "osm" / "out" / "서울_공원.geojson", root / "osm" / "out" / "서울_하천_polygon.geojson"]


def preflight(config: dict[str, Any]) -> list[str]:
    """worker 코드와 공간 데이터 파일이 모두 있는지 확인합니다."""

    # routing pipeline 코드 + 공간 데이터 파일 존재 여부 검사
    paths = [Path(config["routing_worker_dir"]) / "src" / "algo" / "pipeline.py", *spatial_paths(config)]

    # 없는 파일 경로만 반환
    return [str(p) for p in paths if not p.is_file()]


def initialize(config: dict[str, Any]) -> None:
    """프로세스 풀 worker마다 graph, node index, recommend 함수를 한 번만 로드합니다."""

    global _GRAPH, _INDEX, _RECOMMEND, _CONFIG

    # 비싼 graph/data 로딩 전에 필수 파일 누락을 먼저 검사
    missing = preflight(config)
    if missing:
        raise FileNotFoundError("Missing routing data:\n" + "\n".join(missing))

    _CONFIG = config

    # routing-worker 패키지를 import할 수 있도록 경로 추가
    sys.path.insert(0, config["routing_worker_dir"])

    # routing-worker 내부 데이터 경로를 환경변수로 전달
    os.environ["RUNSTOP_DATA_DIR"] = config["data_root"]

    # routing-worker를 수정하지 않고 query_elevation import 경로를 맞춤
    import src.algo

    data_package = types.ModuleType("src.algo.data")
    data_package.__path__ = [str(spatial_paths(config)[1].parent)]
    sys.modules["src.algo.data"] = data_package

    spec = importlib.util.spec_from_file_location("src.algo.data.query_elevation", spatial_paths(config)[1])
    elevation = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = elevation
    spec.loader.exec_module(elevation)

    # routing-worker 내부 stdout은 stderr로 돌려 JSON 결과 출력과 섞이지 않게 함
    with contextlib.redirect_stdout(sys.stderr):
        from src.algo.pipeline import recommend
        from src.algo.utils.graph import load_graphml, NodeIndex

        # 각 worker 프로세스에서 graph와 검색 index를 한 번만 생성
        _GRAPH = load_graphml(config["graph_path"])
        _INDEX = NodeIndex(_GRAPH)

    _RECOMMEND = recommend


def candidate_identity(candidate: dict[str, Any]) -> str:
    """좌표열 기준으로 후보 경로의 안정적인 중복 제거 키를 만듭니다."""

    # 경로 좌표를 동일한 JSON 문자열로 직렬화
    encoded = json.dumps(candidate.get("coords"), separators=(",", ":"), allow_nan=False)

    # 동일 좌표열이면 항상 같은 SHA256 생성
    return hashlib.sha256(encoded.encode()).hexdigest()


def select_pool(
    candidates: list[dict[str, Any]],
    policy: dict[str, Any],
    seed: int,
    request_id: str,
) -> list[dict[str, Any]]:
    """중복 후보를 제거하고 정책 maximum을 넘으면 seed 기반으로 샘플링합니다."""

    # 같은 좌표열 경로는 하나만 남김
    unique = {candidate_identity(c): c for c in candidates}
    identities = sorted(unique)

    # 후보가 너무 많으면 재현 가능한 방식으로 maximum까지만 샘플링
    if len(identities) > policy["maximum"]:
        rng = random.Random(f"{seed}:{request_id}")
        identities = sorted(rng.sample(identities, policy["maximum"]))

    # SHA256 일부를 candidate_id로 사용
    return [{**unique[key], "candidate_id": key[:24]} for key in identities]


def run_job(job: dict[str, Any]) -> dict[str, Any]:
    """단일 요청에 대해 후보 경로를 만들고 부족하면 재시도합니다."""

    policy = _CONFIG["candidates"]

    try:
        pool = []
        attempts = 0

        # 후보가 target 수에 도달할 때까지 방향 수를 늘려 재시도
        for attempt in range(policy["retries"] + 1):
            attempts += 1

            with contextlib.redirect_stdout(sys.stderr):
                candidates = _RECOMMEND( _GRAPH, _INDEX, **job["args"], n_directions=_CONFIG["n_directions"] * (attempt + 1), top_k=1000000)

            # 기존 후보 + 새 후보를 합친 뒤 중복 제거 및 최대 개수 제한
            pool = select_pool(pool + candidates, policy, _CONFIG["seed"], job["request_id"])

            if len(pool) >= policy["target"]:
                break

        # 최소 후보 수보다 적으면 shortage 상태 반환
        if len(pool) < policy["minimum"]:
            return {
                "request_id": job["request_id"],
                "status": "shortage",
                "count": len(pool),
                "attempts": attempts,
                "error": f"only {len(pool)} candidates; minimum {policy['minimum']}",
            }

        # 정상 생성 결과
        return {"request_id": job["request_id"], "status": "ok", "attempts": attempts, "candidates": pool}

    except Exception as exc:
        # 개별 요청 실패는 전체 프로세스를 죽이지 않고 결과 상태로 반환
        return {"request_id": job["request_id"], "status": "error", "error": f"{type(exc).__name__}: {exc}"}


def main():
    """CLI 인자를 읽고 job 목록을 병렬 worker로 처리해 JSONL로 저장합니다."""

    # 부모 프로세스에서 설정, job, 출력 경로를 전달받음
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--jobs", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    # generate_dataset 쪽에서 만든 임시 JSON 입력 읽기
    config = json.loads(Path(args.config).read_text(encoding="utf-8"))
    jobs = json.loads(Path(args.jobs).read_text(encoding="utf-8"))

    # worker 실행 전 필수 파일 다시 검사
    missing = preflight(config)
    if missing:
        raise FileNotFoundError("Missing routing data:\n" + "\n".join(missing))

    # 결과는 JSONL 형식으로 요청마다 한 줄씩 기록
    with Path(args.output).open("x", encoding="utf-8") as stream:
        # 각 프로세스는 initialize()에서 graph/index/recommend를 한 번만 준비
        with ProcessPoolExecutor(max_workers=config["workers"], initializer=initialize, initargs=(config,)) as executor:
            for index, result in enumerate(executor.map(run_job, jobs, chunksize=1), 1):
                stream.write(json.dumps(result, ensure_ascii=False, allow_nan=False) + "\n")
                stream.flush()

                # 25개 단위로 진행 상황 출력
                if index % 25 == 0 or index == len(jobs):
                    print(f"Routing {index}/{len(jobs)}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()
