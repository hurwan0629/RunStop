import argparse
import _bootstrap
from ai.src.config.loader import load_config
from ai.src.config.schema import ExperimentConfig


def main():
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
