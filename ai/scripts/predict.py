import argparse
import _bootstrap


if __name__ == "__main__":
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
    model = BaseRankingModel.load(args.model)
    frame = pd.read_parquet(args.input)
    frame["model_score"] = model.predict_scores(frame)
    frame.to_parquet(args.output, index=False)
