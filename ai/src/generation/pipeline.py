"""CLI에서만 실행되는 데이터 생성 흐름입니다. 에디터는 설정 검증만 하고 생성은 실행하지 않습니다."""
import json
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from ai.src.config.schema import GenerationConfig
from ai.src.config.loader import resolve_path, dump_config
from ai.src.generation.user_sampler import load_users
from ai.src.generation.request_sampler import normalize_requests, request_features
from ai.src.generation.candidate_worker import preflight, spatial_paths
from ai.src.experiment.artifacts import write_json, sha256_file, environment_snapshot


def resolved_worker_config(config: GenerationConfig) -> dict[str, Any]:
    """서브프로세스로 넘길 worker 경로 설정을 절대 경로 문자열로 바꿉니다."""
    result = config.model_dump()

    # 다른 프로세스로 넘기기 전에 파일 시스템 경로만 절대 경로로 정리합니다.
    for key in ("routing_worker_dir", "data_root", "graph_path"):
        result[key] = str(resolve_path(result[key]))

    return result


def inspect_generation(config: GenerationConfig) -> dict[str, Any]:
    """데이터를 만들지 않고 생성 입력과 실행 예정 상태만 확인합니다."""
    # routing-worker를 건드리지 않고 사용자 요청 원본만 읽고 표준 형태로 바꿉니다.
    users = load_users(resolve_path(config.source_json), config.expected_users, config.expected_requests)
    jobs = normalize_requests(users)

    # CLI/UI에서 사전 점검에 쓰는 최소 상태값만 반환합니다.
    return {"users": len(users), "requests": len(jobs), "request_order": "JSON array order (not observed timestamps)",
            "missing_spatial_files": preflight(resolved_worker_config(config)),
            "output_exists": resolve_path(config.output_dir).exists()}

"""
GenerationConfig(
    kind="generation",
    schema_version=1,
    version="candidates_v001",
    seed=42,
    source_json="datasets/runstop_users_1000_5000_requests.json",
    expected_users=1000,
    expected_requests=5000,
    output_dir="datasets/candidates_v001",
    routing_worker_dir="../routing-worker",
    worker_python="",
    data_root="../routing-worker/src/algo/data",
    graph_path="../routing-worker/src/algo/data/서울_보행네트워크.graphml",
    workers=1,
    n_directions=16,
    timeout_seconds=86400,
    request_error="exclude",
    candidates=CandidatePolicy(...),
    utility=UtilityConfig(...),
)
▲ ▲ config 인자 ▲ ▲
"""
def generate_dataset(config: GenerationConfig) -> Path:
    """고정된 사용자 요청과 worker 결과로 후보 경로 parquet 스냅샷을 만듭니다."""

    import pandas as pd
    from ai.src.dataset.schema import flatten_candidate, validate_dataset
    from ai.src.generation.utility import label_candidates

    # 1. 원본 사용자/요청 데이터를 읽고 정규화
    source = resolve_path(config.source_json)
    users = load_users(source, config.expected_users, config.expected_requests)
    jobs = normalize_requests(users)

    # 2. routing-worker 실행에 필요한 경로와 공간 데이터 확인
    worker_config = resolved_worker_config(config)
    missing = preflight(worker_config)
    if missing:
        raise FileNotFoundError("공간 데이터가 없습니다. 생성하지 않았습니다:\n" + "\n".join(missing))

    # 3. 결과 저장 디렉터리 생성, 기존 디렉터리는 덮어쓰지 않음
    output = resolve_path(config.output_dir)
    output.mkdir(parents=True, exist_ok=False)

    # 4. 생성 과정의 기본 metadata 기록
    metadata = {
        "schema_version": 1,
        "status": "running",
        "version": config.version,
        "seed": config.seed,
        "source_json": str(source),
        "source_sha256": sha256_file(source),
        "source_users": len(users),
        "source_requests": len(jobs),
        "utility": config.utility.model_dump(),
        "request_order": "JSON array order, assumed chronology",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "generation_config": config.model_dump(),
    }

    write_json(output / "metadata.json", metadata)
    (output / "config.yaml").write_text(dump_config(config), encoding="utf-8")

    try:
        # 5. 사용한 공간 데이터와 routing-worker 코드 hash 기록
        spatial = {str(p): sha256_file(p) for p in spatial_paths(worker_config)}
        metadata["spatial_files_sha256"] = spatial
        metadata["environment"] = environment_snapshot()

        worker_code = Path(worker_config["routing_worker_dir"]) / "src" / "algo"
        metadata["routing_source_sha256"] = {
            p.relative_to(worker_code).as_posix(): sha256_file(p)
            for p in sorted(worker_code.rglob("*.py"))
            if "data" not in p.relative_to(worker_code).parts
        }

        # 6. worker와 주고받는 중간 파일은 임시 디렉터리에 저장
        with tempfile.TemporaryDirectory(prefix="runstop-routing-") as temporary:
            temp = Path(temporary)

            write_json(temp / "config.json", worker_config)
            write_json(temp / "jobs.json", jobs)

            # 지정된 Python이 없으면 현재 인터프리터 사용
            executable = str(resolve_path(config.worker_python)) if config.worker_python else sys.executable

            # candidate_worker를 별도 프로세스로 실행
            command = [
                executable,
                str(Path(__file__).with_name("candidate_worker.py")),
                "--config", str(temp / "config.json"),
                "--jobs", str(temp / "jobs.json"),
                "--output", str(temp / "results.jsonl"),
            ]

            run_worker(command, worker_config["routing_worker_dir"], config.timeout_seconds)

            # 7. worker 결과를 request_id 기준으로 원래 요청과 매칭
            indexed = {job["request_id"]: job for job in jobs}
            rows, failures, observed, attempts = [], [], set(), {}

            with (temp / "results.jsonl").open(encoding="utf-8") as stream:
                for line in stream:
                    result = json.loads(line)
                    rid = result["request_id"]

                    # 알 수 없는 요청 또는 중복 결과 방지
                    if rid not in indexed or rid in observed:
                        raise ValueError("Worker returned an unknown/duplicate request")

                    observed.add(rid)
                    attempts[rid] = result.get("attempts", 0)

                    # 후보 생성에 실패한 요청 처리
                    if result["status"] != "ok":
                        failures.append(result)
                        fatal = config.candidates.shortage == "error" if result["status"] == "shortage" else config.request_error == "error"

                        if fatal:
                            write_json(output / "failures.json", failures)
                            raise ValueError(f"{rid}: {result['error']}")

                        continue

                    # 8. 정상 후보에 Utility / rank / relevance label 생성
                    job = indexed[rid]
                    labels = label_candidates(result["candidates"], job, config.utility)

                    # 요청 feature + 후보 feature + label을 하나의 학습 행으로 결합
                    for candidate, label in zip(result["candidates"], labels):
                        rows.append({
                            **request_features(job),
                            **flatten_candidate(candidate),
                            **label,
                            "candidate_id": candidate["candidate_id"],
                        })

            # 모든 요청에 worker 결과가 존재하는지 확인
            if observed != set(indexed):
                raise ValueError("Worker omitted requests")

        # 9. 최종 DataFrame schema와 label 일관성 검사
        frame = validate_dataset(pd.DataFrame(rows), config.utility.relevance_levels)

        # 요청당 후보 개수가 설정 범위 안인지 검사
        counts = frame.groupby("request_id").size()
        if not counts.between(config.candidates.minimum, config.candidates.maximum).all():
            raise ValueError("Candidate counts violate generation policy")

        # 10. 학습용 parquet 저장
        frame.to_parquet(output / "candidates.parquet", index=False)
        pd.DataFrame([request_features(job) for job in jobs]).to_parquet(output / "requests.parquet", index=False)

        pd.DataFrame([
            {"user_id": u["user_id"], "profile_json": json.dumps(u["profile"], ensure_ascii=False)}
            for u in users
        ]).to_parquet(output / "users.parquet", index=False)

        write_json(output / "failures.json", failures)

        # 11. 생성 성공 정보와 통계 기록
        metadata.update(
            status="complete",
            candidates_sha256=sha256_file(output / "candidates.parquet"),
            candidate_rows=len(frame),
            valid_requests=int(counts.size),
            failed_requests=len(failures),
            candidate_count_stats={"min": int(counts.min()), "max": int(counts.max()), "mean": float(counts.mean())},
            attempts=attempts,
        )

        write_json(output / "metadata.json", metadata)

    except Exception as exc:
        # 12. 실패해도 원인을 metadata에 남김
        metadata.update(status="failed", error=f"{type(exc).__name__}: {exc}")
        write_json(output / "metadata.json", metadata)
        raise

    return output


def run_worker(command: list[str], cwd: str | Path, timeout: int) -> None:
    """timeout/중단 시 Windows pool 자식까지 포함해 실행한 프로세스 트리를 종료합니다."""
    import psutil
    process = subprocess.Popen(command, cwd=cwd)

    try:
        returncode = process.wait(timeout=timeout)
        if returncode:
            raise subprocess.CalledProcessError(returncode, command)
        
    except (subprocess.TimeoutExpired, KeyboardInterrupt):
        # 부모만 죽이면 자식 process pool이 남을 수 있어 recursive child까지 정리합니다.
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
