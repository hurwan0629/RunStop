"""데이터 생성이나 실험 실행 없이 검증된 YAML 템플릿을 만듭니다."""
import argparse
from pathlib import Path
import _bootstrap
from ai.src.config.schema import GenerationConfig, ExperimentConfig, ModelConfig, PARAM_SCHEMAS
from ai.src.config.loader import dump_config


if __name__ == '__main__':
    # kind/model 인자로 기본 설정 객체를 만들고 새 파일로 저장합니다.
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--kind',choices=['experiment','generation'],default='experiment')
    parser.add_argument('--model',choices=sorted(PARAM_SCHEMAS),default='lightgbm_ranker')
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    config=GenerationConfig() if args.kind=='generation' else ExperimentConfig(name=args.model+'_experiment',model=ModelConfig(name=args.model))
    output=Path(args.output)
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('x',encoding='utf-8') as stream:
        stream.write(dump_config(config))
    print(output)
