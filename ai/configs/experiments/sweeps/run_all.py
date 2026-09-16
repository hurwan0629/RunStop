from __future__ import annotations

import subprocess
import sys
from pathlib import Path


# ./*.yaml 파일 전체 실행 스크립트
def main() -> int:
    sweep_dir = Path(__file__).resolve().parent
    root = sweep_dir.parents[3]
    runner = root / "ai" / "scripts" / "run_experiment.py"
    configs = sorted(sweep_dir.glob("*.yaml"))
    failures: list[Path] = []

    for config in configs:
        print(f"\n=== {config.name} ===", flush=True)
        result = subprocess.run(
            [sys.executable, str(runner), "--config", str(config)],
            cwd=root,
        )
        if result.returncode != 0:
            failures.append(config)

    if failures:
        print("\nFailed configs:")
        for config in failures:
            print(f"- {config.name}")
        return 1

    print(f"\nCompleted {len(configs)} configs.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
