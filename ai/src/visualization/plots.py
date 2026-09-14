"""실험 metric을 간단한 PNG 그래프로 저장합니다."""


def plot_metrics(metrics, directory, top_k):
    """overall/warm/cold의 NDCG와 regret을 baseline/model 막대그래프로 그립니다."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    directory.mkdir(parents=True, exist_ok=True)

    # headless 환경에서도 저장 가능한 Agg backend로 고정합니다. (GUI X)
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    cohorts = ["overall", "warm_start", "cold_start"]
    x = np.arange(len(cohorts))
    for ax, metric in zip(axes, [f"ndcg@{top_k}", "utility_regret"]):
        for i, label in enumerate(["baseline", "model"]):
            ax.bar(x + (i - 0.5) * 0.34, [metrics[c][label][metric]["mean"] for c in cohorts], width=0.34, label=label, color=["#94a3b8", "#0f766e"][i])
        ax.set_xticks(x, cohorts)
        ax.set_title(metric)
        ax.legend()
    fig.tight_layout()
    fig.savefig(directory / "ranking_metrics.png", dpi=160)
    plt.close(fig)
