"""Generate only when invoked explicitly. --check never imports routing or writes datasets."""
import argparse
import json
import _bootstrap
from ai.src.config.loader import load_config
from ai.src.config.schema import GenerationConfig
from ai.src.generation.pipeline import generate_dataset, inspect_generation


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--check", action="store_true", help="Validate JSON and list missing data without generation")
    args = parser.parse_args()
    config = load_config(args.config)
    if not isinstance(config, GenerationConfig):
        parser.error("generation YAML required")
    print(json.dumps(inspect_generation(config), ensure_ascii=False, indent=2) if args.check else generate_dataset(config))


if __name__ == "__main__":
    main()
