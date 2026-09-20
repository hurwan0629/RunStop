"""실험 metric을 간단한 PNG 그래프로 저장합니다."""


# metrics의 구조의 경우에는 아래와 같은 키값들이 존재하는 dict 구조입니다. 각각의 키값들을 cohort라고 부릅니다.
# - overall: 전체에 대한 
# - warm_start: 이미 평가한 사용자들에 대한 새로운 요청 테스트
# - cold_start: 새로운 사용자들에 대한 요청 테스트
# 
# 각각의 cohort에 대해서는 model, baseline, model_minus_baseline 이라는 딕셔너리가 또 존재하며 해당 값의 내부에는 
# requests: int, users: int, ndcg@3: {mean, confidence_interval}, ... 등과 같은 평가지표들이 들어있습니다.
# top_k의 경우에는 experiment/*.yaml의 설정값을 그대로 받을 수 있으며 
# 1. scripts/train.py load_config()
# 2. ExperimentConfig.evaluation.top_k 에서 값을 받아와
# 3. train_model(config)
# 4. evaluate(..., config.evaluation, ...)
# 5. request_metrics(?, config.top_k)
# 6. ndcg_at_k(..., k)
# 을 거친 뒤 plot_metrics()
def plot_metrics(metrics, directory, top_k):
    """전달된 평가 그룹의 NDCG와 regret을 baseline/model 막대그래프로 그립니다."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np

    # 출력할 plot/ 에 대한 디렉토리를 생성해주기
    directory.mkdir(parents=True, exist_ok=True)

    # headless 환경에서도 저장 가능한 Agg backend로 고정합니다. (GUI X)
    fig, axes = plt.subplots(1, 2, figsize=(10, 4))
    # 전체 확인, 기존 사용자 예측, 새로운 사용자 예측시에 나올 수 있는 결과에 대해서 출력을 합니다.
    cohorts = list(metrics)
    # 3개의 값을 저장해야하기 때문에 ndarray를 생성해줍니다.
    x = np.arange(len(cohorts))
    # plot를 2개 생성해주는데 하나는 ndcg 점수이며 하나는 점수 오차를 의미합니다.
    # 또한 보여줄 평가지표에 대해서 선택을 하여 보여주게 되빈다.
    for ax, metric in zip(axes, [f"ndcg@{top_k}", "utility_regret"]):
        # plot 하나에 대해서 2개의 막대를 생성해줍니다 (비교를 위해)
        for i, label in enumerate(["baseline", "model"]):
            ax.bar(
              # x값은 x위치의 절대 상수입니다.
              x + (i - 0.5) * 0.34,   # 각각의 막대에 대해서 기존 위치 + 일부를 옮겨주는 방식으로 그려줍니다.
              # [n개의 평가지표를 각각의 모델에 대해서 찍어주기]
              # 평가지표의 코호트안의 
              # 특정 모델에 대한
              # 평가지표를 보여줍니다.
              [metrics[c][label][metric]["mean"] for c in cohorts], 
              width=0.34, # 
              label=label, # 어떤 모델의 지표인지 보여주기 위해서 그려주는 라벨값입니다.
              color=["#94a3b8", "#0f766e"][i] # baseline이면 회색, model의 경우에는 녹색으로 표현해줍니다.
            )
        ax.set_xticks(x, cohorts)
        ax.set_title(metric)
        ax.legend()
    fig.tight_layout()
    fig.savefig(directory / "ranking_metrics.png", dpi=160)
    plt.close(fig)
