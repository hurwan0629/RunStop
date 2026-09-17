"""완료된 학습 결과 폴더의 모델로 Warm/Cold Test를 평가합니다."""
import argparse
import _bootstrap


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifact", required=True, help="Training folder containing model/, config.yaml and saved splits")
    args = parser.parse_args()
    from ai.src.experiment.testing import evaluate_saved_model
    print(evaluate_saved_model(args.artifact))


if __name__ == "__main__":
    main()
