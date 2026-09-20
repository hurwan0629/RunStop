"""모델과 baseline을 같은 split에서 평가하고 요청 단위 metric을 집계합니다."""
import time
import numpy as np
import pandas as pd
from ai.src.config.schema import EvaluationConfig
from ai.src.experiment.metrics import request_metrics, confidence_interval
from ai.src.models.base import BaseRankingModel


def evaluate(
    model: BaseRankingModel,
    parts: dict[str, pd.DataFrame],
    config: EvaluationConfig,
    seed: int,
) -> tuple[pd.DataFrame, pd.DataFrame, dict, dict]:
    """명시적으로 전달한 split만 평가한다: 학습은 validation, 테스트는 warm/cold."""
    if not parts or any(frame.empty for frame in parts.values()):
        raise ValueError("Evaluation requires non-empty splits")
    # cohort별 후보에 모델 점수를 붙이고 실제 추론 시간을 측정합니다.
    
    predictions, request_rows = [], []
    # 평가에 걸리는 시간 설정
    inference_seconds = 0.0

    for cohort in parts:
        frame = parts[cohort].copy()
        # 요청 단위 전처리+예측 시간을 실제 호출 기준으로 측정합니다.
        frame["model_score"] = np.nan
        # 하나의 요청 = 하나의 그룹으로 설정하여 순서대로 예측해줍니다.
        for _, group in frame.groupby("request_id", sort=True):
            # 시작 시간
            started = time.perf_counter()
            
            scores = model.check_scores(model.predict_scores(group), len(group))
            # 시간 누적
            inference_seconds += time.perf_counter() - started
            frame.loc[group.index, "model_score"] = scores
        frame["cohort"] = cohort

        # model 점수와 condition_score baseline을 같은 방식으로 rank/metric 처리합니다.
        for request_id, group in frame.groupby("request_id", sort=True):
            for label, score_key in (("model", "model_score"), ("baseline", "condition_score")):
                
                ordered = group.sort_values([score_key, "candidate_id"], ascending=[False, True], kind="stable")

                frame.loc[ordered.index, f"{label}_rank"] = np. arange(1, len(ordered) + 1)

                request_rows.append({"request_id": request_id, "user_id": group.user_id.iloc[0], "cohort": cohort,
                                     "predictor": label, **request_metrics(ordered.utility, ordered.relevance, config.top_k)})
        predictions.append(frame)

    # 요청별 metric을 overall/warm/cold 단위로 평균과 신뢰구간으로 집계합니다.
    per_request = pd.DataFrame(request_rows)
    metrics = {}
    # MRR은 현재 제외한다. 실제 선택 로그의 "첫 번째 relevant item"을 평가하는 대신
    # synthetic utility로 후보 전체 순위를 만들고 있어서 relevant 기준을 별도로 정해야 한다.
    # ground_truth_rank == 1을 relevant로 두면 top1_best_utility와 역할이 겹치므로,
    # 여기서는 Top-K 순서 품질, 1위 적중, regret, pairwise 순서 정확도만 집계한다.
    keys = [f"ndcg@{config.top_k}", "top1_best_utility", "utility_regret", "pairwise_accuracy"]
    for cohort in ("overall", *parts):
        data = per_request if cohort == "overall" else per_request[per_request.cohort == cohort]
        metrics[cohort] = {}
        for predictor in ("model", "baseline"):
            subset = data[data.predictor == predictor]
            result = {"requests": len(subset), "users": subset.user_id.nunique()}
            for key in keys:
                mean = subset[key].mean()
                result[key] = {"mean": None if pd.isna(mean) else float(mean),
                               "confidence_interval": confidence_interval(subset, key, config.bootstrap_samples, config.confidence_level, seed)}
            metrics[cohort][predictor] = result
        metrics[cohort]["model_minus_baseline"] = {
            key: metrics[cohort]["model"][key]["mean"] - metrics[cohort]["baseline"][key]["mean"]
            if metrics[cohort]["model"][key]["mean"] is not None and metrics[cohort]["baseline"][key]["mean"] is not None else None for key in keys}

    # 추론 시간은 요청 1개당 한 번 호출하는 현재 운영 가정을 그대로 기록합니다.
    return pd.concat(predictions), per_request, metrics, {
        "inference_seconds": inference_seconds,
        "inference_ms_per_request": inference_seconds * 1000 / (len(per_request) / 2),
        "inference_protocol": "one call per request; includes preprocessing and first call; no warmup"}


def save_evaluation(model, parts, config, directory):
    """Val/Test에서 같은 지표·예측·그래프 저장을 재사용한다."""
    from ai.src.experiment.artifacts import write_json
    from ai.src.experiment.plots import plot_metrics

    directory.mkdir(parents=True, exist_ok=True)
    predictions, per_request, metrics, inference = evaluate(
        model, parts, config.evaluation, config.seed,
    )
    predictions.to_parquet(directory / "predictions.parquet", index=False)
    per_request.to_parquet(directory / "request_metrics.parquet", index=False)
    write_json(directory / "metrics.json", metrics)
    plot_metrics(metrics, directory / "plots", config.evaluation.top_k)
    return inference
