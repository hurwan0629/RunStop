"""신뢰한 모델 bundle로 parquet 후보 파일에 model_score를 추가합니다."""
import argparse
import _bootstrap


if __name__ == "__main__":
    # 입력/출력 경로를 받고 기존 출력 파일은 덮어쓰지 않습니다.
    import pandas as pd
    from ai.src.models.base import BaseRankingModel
    parser = argparse.ArgumentParser(description="Predict from a trusted model bundle and feature Parquet")
    parser.add_argument("--model", required=True)
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    from pathlib import Path
    if Path(args.output).exists():
        parser.error("Output already exists")
    # 저장된 모델 bundle을 로드해 전체 입력 행에 점수를 붙입니다.
    model = BaseRankingModel.load(args.model)
    frame = pd.read_parquet(args.input)
    frame["model_score"] = model.predict_scores(frame)
    frame.to_parquet(args.output, index=False)
