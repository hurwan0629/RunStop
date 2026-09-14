"""검증된 experiment YAML로 오프라인 ranking 실험을 실행합니다."""
import argparse
import _bootstrap
from ai.src.config.loader import load_config
from ai.src.config.schema import ExperimentConfig


def main():
    """CLI 인자를 읽고 설정 검증 또는 실험 실행을 수행합니다."""
    # 먼저 YAML 종류를 확인하고 validate-only면 모델 학습을 건너뜁니다.
    parser = argparse.ArgumentParser(description="Run one offline ranking experiment")
    parser.add_argument("--config", required=True)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    config = load_config(args.config)
    if not isinstance(config, ExperimentConfig):
        parser.error("experiment YAML required")
    if args.validate_only:
        print("Configuration valid. No dataset loaded or model trained.")
    else:
        from ai.src.experiment.runner import run_experiment
        print(run_experiment(config))


if __name__ == "__main__":
    main()
