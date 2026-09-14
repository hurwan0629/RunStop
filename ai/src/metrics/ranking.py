"""요청 단위 ranking metric입니다. utility 동점은 임의 binary 선택으로 처리하지 않습니다."""
import numpy as np


def ndcg_at_k(relevance, k):
    """이미 예측 순서로 정렬된 relevance에서 NDCG@k를 계산합니다."""
    rel = np.asarray(relevance, dtype=float)
    if k < 1 or rel.ndim != 1 or not len(rel) or not np.isfinite(rel).all() or (rel < 0).any():
        raise ValueError("Invalid NDCG input")
    n = min(k, len(rel))
    discount = np.log2(np.arange(2, n + 2))
    dcg = np.sum(np.expm1(rel[:n] * np.log(2)) / discount)
    ideal = np.sum(np.expm1(np.sort(rel)[::-1][:n] * np.log(2)) / discount)
    return float(dcg / ideal) if ideal else 0.0


def request_metrics(utility, relevance, k):
    """요청 하나의 ranking 품질을 여러 metric으로 계산합니다."""
    u = np.asarray(utility, dtype=float)
    # utility가 다른 후보 쌍에 대해서만 pairwise 순서가 맞는지 봅니다.
    comparisons = [u[i] >= u[j] for i in range(len(u)) for j in range(i + 1, len(u)) if u[i] != u[j]]
    return {f"ndcg@{k}": ndcg_at_k(relevance, k), "top1_best_utility": float(u[0] == u.max()),
            "utility_regret": float(u.max() - u[0]),
            "pairwise_accuracy": float(np.mean(comparisons)) if comparisons else None}


def confidence_interval(frame, metric, samples, confidence, seed):
    """사용자 단위 cluster bootstrap으로 신뢰구간을 계산합니다."""
    valid = frame.dropna(subset=[metric])
    if valid.empty or samples == 0 or valid.user_id.nunique() < 2:
        return None

    # 같은 사용자의 반복 요청은 bootstrap 샘플링에서도 함께 움직입니다.
    aggregates = valid.groupby("user_id")[metric].agg(["sum", "count"])
    totals, counts = aggregates["sum"].to_numpy(), aggregates["count"].to_numpy()
    rng = np.random.default_rng(seed)
    estimates = []
    for _ in range(samples):
        indices = rng.integers(0, len(totals), size=len(totals))
        estimates.append(totals[indices].sum() / counts[indices].sum())
    alpha = (1 - confidence) / 2
    return [float(v) for v in np.quantile(estimates, [alpha, 1 - alpha])]
