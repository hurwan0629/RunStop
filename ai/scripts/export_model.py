"""완료된 실험 artifact를 inference bundle로 내보냅니다."""

import argparse
import json
import shutil
from pathlib import Path

import _bootstrap


def export_model(source, output):
    """실험 artifact를 독립 실행 가능한 inference bundle로 내보냅니다."""

    source, output = Path(source), Path(output)

    # 완료된 실험만 export
    manifest = json.loads((source / "manifest.json").read_text(encoding="utf-8"))
    if manifest["status"] != "complete":
        raise ValueError("Only complete experiments can be exported")

    # 모델과 runtime 복사
    shutil.copytree(source / "model", output)
    shutil.copytree(source / "runtime" / "ai", output / "ai")

    # 실험 설정과 metadata 복사
    for name in ("config.yaml", "environment.json", "dataset_reference.json", "manifest.json"):
        shutil.copy2(source / name, output / name)

    # 모델별 필요한 패키지만 requirements에 저장
    environment = json.loads((source / "environment.json").read_text(encoding="utf-8"))

    model_packages = {
        "lightgbm_ranker": "lightgbm",
        "xgboost_ranker": "xgboost",
        "catboost_ranker": "catboost",
        "ranknet": "torch",
    }

    required = {"numpy", "pandas", "pyarrow", "scikit-learn", "pydantic"}

    if manifest["model"] in model_packages:
        required.add(model_packages[manifest["model"]])

    pins = [
        f"{name}=={version}"
        for name, version in environment["packages"].items()
        if name.lower() in required
    ]

    (output / "requirements.txt").write_text(
        "\n".join(sorted(pins)) + "\n",
        encoding="utf-8",
    )

    # bundle 단독 실행용 predict 스크립트 생성
    (output / "predict.py").write_text(
        'from pathlib import Path\n'
        'import argparse\n'
        'import pandas as pd\n'
        'from ai.src.models.base import BaseRankingModel\n'
        'p=argparse.ArgumentParser()\n'
        'p.add_argument("--input",required=True)\n'
        'p.add_argument("--output",required=True)\n'
        'a=p.parse_args()\n'
        'if Path(a.output).exists(): raise FileExistsError(a.output)\n'
        'm=BaseRankingModel.load(Path(__file__).parent)\n'
        'df=pd.read_parquet(a.input)\n'
        'df["model_score"]=m.predict_scores(df)\n'
        'df.to_parquet(a.output,index=False)\n',
        encoding="utf-8",
    )

    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    print(export_model(args.artifact, args.output))