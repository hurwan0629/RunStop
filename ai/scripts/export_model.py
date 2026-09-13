"""Export a trusted completed experiment as a portable inference bundle."""
import argparse
import json
import shutil
from pathlib import Path
import _bootstrap


def export_model(source, output):
    source, output = Path(source), Path(output)
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    if manifest["status"] != "complete":
        raise ValueError("Only complete experiments can be exported")
    shutil.copytree(source / "model", output)  # refuses existing targets
    shutil.copytree(source / "runtime" / "ai", output / "ai")
    for name in ("config.yaml", "environment.json", "dataset_reference.json", "manifest.json"):
        shutil.copy2(source / name, output / name)
    environment = json.loads((source / "environment.json").read_text(encoding="utf-8"))
    model_packages = {"lightgbm_ranker": "lightgbm", "xgboost_ranker": "xgboost", "catboost_ranker": "catboost", "ranknet": "torch"}
    required = {"numpy", "pandas", "pyarrow", "scikit-learn", "pydantic"}
    if manifest["model"] in model_packages:
        required.add(model_packages[manifest["model"]])
    pins = [f"{name}=={version}" for name, version in environment["packages"].items() if name.lower() in required]
    (output / "requirements.txt").write_text("\n".join(sorted(pins)) + "\n", encoding="utf-8")
    (output / "predict.py").write_text(
        'from pathlib import Path\nimport argparse\nimport pandas as pd\n'
        'from ai.src.models.base import BaseRankingModel\n'
        'p=argparse.ArgumentParser()\np.add_argument("--input",required=True)\np.add_argument("--output",required=True)\n'
        'a=p.parse_args()\n'
        'if Path(a.output).exists(): raise FileExistsError(a.output)\n'
        'm=BaseRankingModel.load(Path(__file__).parent)\ndf=pd.read_parquet(a.input)\n'
        'df["model_score"]=m.predict_scores(df)\ndf.to_parquet(a.output,index=False)\n', encoding="utf-8")
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    print(export_model(args.artifact, args.output))
