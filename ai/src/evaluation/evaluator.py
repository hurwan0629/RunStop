import time
import numpy as np
import pandas as pd
from ai.src.metrics.ranking import request_metrics, confidence_interval


def evaluate(model, parts, config, seed):
    predictions, request_rows = [], []
    inference_seconds = 0.0
    for cohort in ("warm_start", "cold_start"):
        frame = parts[cohort].copy()
        # Measure actual per-request preprocessing+prediction, with explicit cold-first timing.
        frame["model_score"] = np.nan
        for _, group in frame.groupby("request_id", sort=True):
            started = time.perf_counter()
            scores = model.check_scores(model.predict_scores(group), len(group))
            inference_seconds += time.perf_counter() - started
            frame.loc[group.index, "model_score"] = scores
        frame["cohort"] = cohort
        for request_id, group in frame.groupby("request_id", sort=True):
            for label, score_key in (("model", "model_score"), ("baseline", "condition_score")):
                ordered = group.sort_values([score_key, "candidate_id"], ascending=[False, True], kind="stable")
                frame.loc[ordered.index, f"{label}_rank"] = np.arange(1, len(ordered) + 1)
                request_rows.append({"request_id": request_id, "user_id": group.user_id.iloc[0], "cohort": cohort,
                                     "predictor": label, **request_metrics(ordered.utility, ordered.relevance, config.top_k)})
        predictions.append(frame)
    per_request = pd.DataFrame(request_rows)
    metrics = {}
    keys = [f"ndcg@{config.top_k}", "top1_best_utility", "utility_regret", "pairwise_accuracy"]
    for cohort in ("overall", "warm_start", "cold_start"):
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
    return pd.concat(predictions), per_request, metrics, {
        "inference_seconds": inference_seconds,
        "inference_ms_per_request": inference_seconds * 1000 / (len(per_request) / 2),
        "inference_protocol": "one call per request; includes preprocessing; first cold call included; no warmup"}
