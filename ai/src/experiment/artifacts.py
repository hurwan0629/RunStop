"""실험 artifact의 해시, 환경 정보, manifest를 관리합니다."""
import hashlib
import importlib.metadata
import json
import platform
import shutil
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from ai.src.config.loader import AI_ROOT, dump_config


def sha256_file(path):
    """파일을 chunk 단위로 읽어 SHA-256 해시를 계산합니다."""
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, data):
    """NaN을 허용하지 않는 UTF-8 JSON 파일을 씁니다."""
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")


def environment_snapshot():
    """실험 재현에 필요한 Python/package/git/source 상태를 기록합니다."""
    # 설치된 패키지와 ai/src 코드 해시를 수집합니다.
    packages = {d.metadata["Name"]: d.version for d in importlib.metadata.distributions() if d.metadata["Name"]}
    code_hash = hashlib.sha256()
    for path in sorted((AI_ROOT / "src").rglob("*.py")):
        code_hash.update(path.relative_to(AI_ROOT).as_posix().encode())
        code_hash.update(path.read_bytes())

    # git 정보는 실패해도 실험 자체를 막지 않습니다.
    try:
        commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=AI_ROOT, text=True, capture_output=True, timeout=5).stdout.strip()
        dirty = subprocess.run(["git", "status", "--porcelain", "--", "ai"], cwd=AI_ROOT.parent, text=True, capture_output=True, timeout=5).stdout
    except (OSError, subprocess.TimeoutExpired):
        commit, dirty = None, "unknown"
    return {"python": sys.version, "platform": platform.platform(), "packages": packages,
            "git_commit": commit, "ai_worktree_changes": dirty, "ai_source_sha256": code_hash.hexdigest()}


def begin_run(output, config):
    """새 실험 artifact 디렉터리를 만들고 실행 시점 runtime을 복사합니다."""
    # 중복을 피하기 위해 UTC 시각과 짧은 uuid를 디렉터리명에 포함합니다.
    path = Path(output) / (datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S") + "_" + config.name + "_" + uuid.uuid4().hex[:8])
    path.mkdir(parents=True, exist_ok=False)
    (path / "config.yaml").write_text(dump_config(config), encoding="utf-8")
    write_json(path / "environment.json", environment_snapshot())

    # 나중에 pickle 모델을 같은 코드로 읽을 수 있도록 현재 ai runtime을 복사합니다.
    runtime = path / "runtime" / "ai"
    runtime.mkdir(parents=True)
    shutil.copy2(AI_ROOT / "__init__.py", runtime / "__init__.py")
    for source in sorted((AI_ROOT / "src").rglob("*.py")):
        target = runtime / source.relative_to(AI_ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    manifest = {"schema_version": 1, "status": "running", "started_at": datetime.now(timezone.utc).isoformat(), "name": config.name, "model": config.model.name}
    write_json(path / "manifest.json", manifest)
    return path, manifest


def finish_run(path, manifest, error=None):
    """manifest 상태와 artifact 파일 목록/해시를 최종 기록합니다."""
    manifest.update(status="failed" if error else "complete", finished_at=datetime.now(timezone.utc).isoformat())
    if error:
        manifest["error"] = str(error)
    manifest["files"] = {p.relative_to(path).as_posix(): {"bytes": p.stat().st_size, "sha256": sha256_file(p)}
                         for p in sorted(path.rglob("*")) if p.is_file() and p.name != "manifest.json"}
    write_json(path / "manifest.json", manifest)
