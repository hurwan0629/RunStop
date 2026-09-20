"""기존 experiment YAML로 Train 학습 및 Val 평가를 실행합니다."""
import argparse
import _bootstrap
from ai.src.config.loader import load_config
from ai.src.config.schema import ExperimentConfig


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    config = load_config(args.config)
    if not isinstance(config, ExperimentConfig):
        parser.error("experiment YAML required")
    if args.validate_only:
        print("Configuration valid. No dataset loaded or model trained.")
        return
    from ai.src.experiment.training import train_model
    print(train_model(config))


if __name__ == "__main__":
    main()
