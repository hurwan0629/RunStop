"""요청 단위 ranking metric입니다. utility 동점은 임의 binary 선택으로 처리하지 않습니다."""
import numpy as np
import pandas as pd


def ndcg_at_k(relevance, k: int) -> float:
    """
    
    이미 예측 순서로 정렬된 relevance에서 NDCG@k를 계산합니다.
    
    모델이 만든(인자로 들어오는) relevence가 [2, 3, 1, 0] 이라면 실제로 정답은 [3, 2, 1, 0] 입니다.
    """
    rel = np.asarray(relevance, dtype=float)
    if k < 1 or rel.ndim != 1 or not len(rel) or not np.isfinite(rel).all() or (rel < 0).any():
        raise ValueError("Invalid NDCG input")
    n = min(k, len(rel))

    # 순위별 점수 배열로 만들어주기 1, 0.6..., ...
    discount = np.log2(np.arange(2, n + 2))

    # expm1(x) = e**x - 1
    # 각각 순위에 대해서 e**(rel점수*ln2)-1 / relDiscount
    # 최종적으로 높은 rel 점수일수록 disconut의 역수를 곱해줘서 더 중요하게 취급
    dcg = np.sum(
        np.expm1(rel[:n] * np.log(2)) 
        / discount
    )
    # 위와 동일한 식이지만 rel이 정렬되었을 때의 기준
    ideal = np.sum(np.expm1(np.sort(rel)[::-1][:n] * np.log(2)) / discount)
    return float(dcg / ideal) if ideal else 0.0


def request_metrics(utility, relevance, k: int) -> dict[str, float | None]:
    """요청 하나의 ranking 품질을 여러 metric으로 계산합니다."""
    u = np.asarray(utility, dtype=float)
    # utility가 다른 후보 쌍에 대해서만 pairwise 순서가 맞는지 봅니다.
    comparisons = [u[i] >= u[j] for i in range(len(u)) for j in range(i + 1, len(u)) if u[i] != u[j]]
    return {f"ndcg@{k}": ndcg_at_k(relevance, k), "top1_best_utility": float(u[0] == u.max()),
            "utility_regret": float(u.max() - u[0]),
            "pairwise_accuracy": float(np.mean(comparisons)) if comparisons else None}


def confidence_interval(
    frame: pd.DataFrame,
    metric: str,
    samples: int,
    confidence: float,
    seed: int,
) -> list[float] | None:
    """사용자 단위 cluster bootstrap으로 신뢰구간을 계산합니다."""

    # bootstrap로 계산할 metric의 결측치 제거
    valid = frame.dropna(subset=[metric])
    if valid.empty or samples == 0 or valid.user_id.nunique() < 2:
        return None

    # 같은 사용자의 반복 요청은 bootstrap 샘플링에서도 함께 움직입니다.
    # (2명의 사용자 A 요청이 있으면 하나로 합쳐주기)
    aggregates = valid.groupby("user_id")[metric].agg(["sum", "count"])
    totals, counts = aggregates["sum"].to_numpy(), aggregates["count"].to_numpy()
    rng = np.random.default_rng(seed)
    estimates = []

    # confidence score를 뽑기 위해 samples 수만큼 돌려주기
    for _ in range(samples):
        indices = rng.integers(0, len(totals), size=len(totals))
        estimates.append(totals[indices].sum() / counts[indices].sum())

    # confidence 범위만큼 남게 뽑아주기
    alpha = (1 - confidence) / 2
    return [float(v) for v in np.quantile(estimates, [alpha, 1 - alpha])]
