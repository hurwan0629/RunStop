"""Request-level ranking metrics. Utility ties are not arbitrary binary selections."""
import numpy as np


def ndcg_at_k(relevance, k):
    rel = np.asarray(relevance, dtype=float)
    if k < 1 or rel.ndim != 1 or not len(rel) or not np.isfinite(rel).all() or (rel < 0).any():
        raise ValueError("Invalid NDCG input")
    n = min(k, len(rel))
    discount = np.log2(np.arange(2, n + 2))
    dcg = np.sum(np.expm1(rel[:n] * np.log(2)) / discount)
    ideal = np.sum(np.expm1(np.sort(rel)[::-1][:n] * np.log(2)) / discount)
    return float(dcg / ideal) if ideal else 0.0


def request_metrics(utility, relevance, k):
    u = np.asarray(utility, dtype=float)
    comparisons = [u[i] >= u[j] for i in range(len(u)) for j in range(i + 1, len(u)) if u[i] != u[j]]
    return {f"ndcg@{k}": ndcg_at_k(relevance, k), "top1_best_utility": float(u[0] == u.max()),
            "utility_regret": float(u.max() - u[0]),
            "pairwise_accuracy": float(np.mean(comparisons)) if comparisons else None}


def confidence_interval(frame, metric, samples, confidence, seed):
    """Cluster bootstrap by user: repeated requests from a user stay together."""
    valid = frame.dropna(subset=[metric])
    if valid.empty or samples == 0 or valid.user_id.nunique() < 2:
        return None
    aggregates = valid.groupby("user_id")[metric].agg(["sum", "count"])
    totals, counts = aggregates["sum"].to_numpy(), aggregates["count"].to_numpy()
    rng = np.random.default_rng(seed)
    estimates = []
    for _ in range(samples):
        indices = rng.integers(0, len(totals), size=len(totals))
        estimates.append(totals[indices].sum() / counts[indices].sum())
    alpha = (1 - confidence) / 2
    return [float(v) for v in np.quantile(estimates, [alpha, 1 - alpha])]
