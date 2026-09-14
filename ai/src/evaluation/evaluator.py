"""모델과 baseline을 같은 split에서 평가하고 요청 단위 metric을 집계합니다."""
import time
import numpy as np
import pandas as pd
from ai.src.config.schema import EvaluationConfig
from ai.src.metrics.ranking import request_metrics, confidence_interval
from ai.src.models.base import BaseRankingModel


def evaluate(
    model: BaseRankingModel,
    parts: dict[str, pd.DataFrame],
    config: EvaluationConfig,
    seed: int,
) -> tuple[pd.DataFrame, pd.DataFrame, dict, dict]:
    """warm/cold cohort별 예측, 요청별 metric, 전체 집계 metric을 반환합니다."""
    # cohort별 후보에 모델 점수를 붙이고 실제 추론 시간을 측정합니다.
    
    predictions, request_rows = [], []
    # 평가에 걸리는 시간 설정
    inference_seconds = 0.0
    # 2번에 걸쳐서 테스트해주기 (기존 사용자, 새로운 사용자)
    for cohort in ("warm_start", "cold_start"):
        # parts에는 trian, validate, warm_start, cold_start 데이터들이 존재함.
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
                frame.loc[ordered.index, f"{label}_rank"] = np.arange(1, len(ordered) + 1)
                request_rows.append({"request_id": request_id, "user_id": group.user_id.iloc[0], "cohort": cohort,
                                     "predictor": label, **request_metrics(ordered.utility, ordered.relevance, config.top_k)})
        predictions.append(frame)

    # 요청별 metric을 overall/warm/cold 단위로 평균과 신뢰구간으로 집계합니다.
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

    # 추론 시간은 요청 1개당 한 번 호출하는 현재 운영 가정을 그대로 기록합니다.
    return pd.concat(predictions), per_request, metrics, {
        "inference_seconds": inference_seconds,
        "inference_ms_per_request": inference_seconds * 1000 / (len(per_request) / 2),
        "inference_protocol": "one call per request; includes preprocessing; first cold call included; no warmup"}
