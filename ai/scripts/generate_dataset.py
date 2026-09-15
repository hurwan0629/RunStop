"""명시적으로 호출할 때만 데이터셋을 생성합니다. --check는 routing import나 파일 생성을 하지 않습니다."""
import argparse
import json
import _bootstrap
from ai.src.config.loader import load_config
from ai.src.config.schema import GenerationConfig
from ai.src.generation.pipeline import generate_dataset, inspect_generation


def main():
    """CLI 인자를 읽고 generation 설정 점검 또는 데이터셋 생성을 실행합니다."""
    # --check는 비용이 큰 routing-worker 호출 없이 입력 상태만 출력합니다.
    parser = argparse.ArgumentParser(description=__doc__)
    # 생성할 데이터셋에 대한 json을 인자로 받는 요소
    parser.add_argument("--config", required=True)
    # jsono 형식만 체크하게 하는 플래그
    parser.add_argument("--check", action="store_true", help="Validate JSON and list missing data without generation")
    args = parser.parse_args()
    config = load_config(args.config)
    if not isinstance(config, GenerationConfig):
        parser.error("generation YAML required")
    print(json.dumps(inspect_generation(config), ensure_ascii=False, indent=2) if args.check else generate_dataset(config))


if __name__ == "__main__":
    main()
