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
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, data):
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")


def environment_snapshot():
    packages = {d.metadata["Name"]: d.version for d in importlib.metadata.distributions() if d.metadata["Name"]}
    code_hash = hashlib.sha256()
    for path in sorted((AI_ROOT / "src").rglob("*.py")):
        code_hash.update(path.relative_to(AI_ROOT).as_posix().encode())
        code_hash.update(path.read_bytes())
    try:
        commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=AI_ROOT, text=True, capture_output=True, timeout=5).stdout.strip()
        dirty = subprocess.run(["git", "status", "--porcelain", "--", "ai"], cwd=AI_ROOT.parent, text=True, capture_output=True, timeout=5).stdout
    except (OSError, subprocess.TimeoutExpired):
        commit, dirty = None, "unknown"
    return {"python": sys.version, "platform": platform.platform(), "packages": packages,
            "git_commit": commit, "ai_worktree_changes": dirty, "ai_source_sha256": code_hash.hexdigest()}


def begin_run(output, config):
    path = Path(output) / (datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S") + "_" + config.name + "_" + uuid.uuid4().hex[:8])
    path.mkdir(parents=True, exist_ok=False)
    (path / "config.yaml").write_text(dump_config(config), encoding="utf-8")
    write_json(path / "environment.json", environment_snapshot())
    # Freeze the Python implementation needed to unpickle and run this exact model later.
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
    manifest.update(status="failed" if error else "complete", finished_at=datetime.now(timezone.utc).isoformat())
    if error:
        manifest["error"] = str(error)
    manifest["files"] = {p.relative_to(path).as_posix(): {"bytes": p.stat().st_size, "sha256": sha256_file(p)}
                         for p in sorted(path.rglob("*")) if p.is_file() and p.name != "manifest.json"}
    write_json(path / "manifest.json", manifest)
