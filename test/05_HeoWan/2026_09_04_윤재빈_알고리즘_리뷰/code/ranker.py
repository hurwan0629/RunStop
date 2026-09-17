"""
학습형 코스 랭커 (Learning-to-Rank) — weighting.py 의 손튜닝 conditionScore 대체용.

현재는 사용자 로그가 없어 **합성 데이터**로 학습한다. 구조가 요점:
  feature = [소점수 11개] + [사용자 가중치 6개]
  label   = 쿼리(추천 1건) 안에서의 선호 순위
  model   = LightGBM LambdaRank

실서비스에서는 _synth_dataset() 자리에
  "추천 3개 중 사용자가 무엇을 골랐나 / 완주했나" 로그를
  같은 feature 스키마로 넣으면 된다.

    python ranker.py              # 합성 데이터로 학습 + NDCG 비교, ranker.txt 저장
"""

from pathlib import Path

import numpy as np

SUB_KEYS = ["distance", "elevation", "toilet", "store", "park", "water",
            "streetlight", "cctv", "surface", "flow", "overlap"]
WEIGHT_KEYS = ["distance", "elevation", "toilet", "store", "park", "night"]
FEATURE_NAMES = [f"sub_{k}" for k in SUB_KEYS] + [f"w_{k}" for k in WEIGHT_KEYS]

MODEL_PATH = Path(__file__).resolve().parent / "ranker.txt"
_BOOSTER = None


# ── feature 만들기 ────────────────────────────────────────────
def build_features(cand, weights=None):
    w = {**{k: 3 for k in WEIGHT_KEYS}, **(weights or {})}
    subs = cand.get("sub_scores", {})
    row = [float(subs.get(k) if subs.get(k) is not None else np.nan) for k in SUB_KEYS]
    row += [float(w.get(k, 3)) for k in WEIGHT_KEYS]
    return row


# ── 예측 ────────────────────────────────────────────────────
def predict_scores(cands, weights=None, model_path=MODEL_PATH):
    """각 후보의 랭킹 점수(높을수록 위). 모델 없으면 None."""
    global _BOOSTER
    p = Path(model_path)
    if not p.exists():
        return None
    if _BOOSTER is None:
        import lightgbm as lgb
        _BOOSTER = lgb.Booster(model_file=str(p))
    X = np.array([build_features(c, weights) for c in cands], dtype=float)
    return list(_BOOSTER.predict(X))


# ── 합성 데이터 ──────────────────────────────────────────────
def _synth_query(rng):
    """추천 1건: 사용자 가중치 하나 + 후보 3~8개 + 각 후보의 '진짜 선호도'."""
    w = {k: int(rng.integers(1, 6)) for k in WEIGHT_KEYS}
    n = int(rng.integers(3, 9))
    rows, utils = [], []
    for _ in range(n):
        s = {
            "distance":   float(np.clip(100 - 45 * rng.random() ** 2, 0, 100)),
            "elevation":  float(rng.uniform(10, 95)),
            "toilet":     100.0 if rng.random() < 0.6 else float(rng.uniform(0, 100)),
            "store":      100.0 if rng.random() < 0.6 else float(rng.uniform(0, 100)),
            "park":       float(rng.random() ** 3 * 100),
            "water":      float(rng.random() ** 4 * 100),
            "streetlight": float(rng.uniform(40, 100)),
            "cctv":       float(rng.uniform(50, 100)),
            "surface":    float(rng.uniform(0, 95)),
            "flow":       float(rng.uniform(65, 100)),
            "overlap":    100.0 if rng.random() < 0.7 else float(rng.uniform(0, 100)),
        }
        wp, wn, wt, ws, we, wd = (w["park"], w["night"], w["toilet"],
                                  w["store"], w["elevation"], w["distance"])
        # '진짜 선호도' — 가중치×feature 상호작용 + 비선형(제곱근, 계단)
        u = (0.010 * wd * s["distance"] + 0.008 * we * s["elevation"]
             + (wp / 5) * (0.22 * s["park"] + 0.08 * s["water"])
             + (wn / 5) * (0.14 * s["streetlight"] + 0.05 * s["cctv"])
             + (wt / 5) * 0.14 * s["toilet"] + (ws / 5) * 0.05 * s["store"]
             + 0.18 * s["surface"] + 0.09 * s["flow"] + 0.09 * s["overlap"]
             + 6.0 * np.sqrt(s["park"] / 100)              # 초반 녹지 보너스 (비선형)
             - 15.0 * (s["surface"] < 20)                  # 노면 나쁘면 계단식 감점
             + rng.normal(0, 3))
        rows.append(build_features({"sub_scores": s}, w))
        utils.append(u)
    # 쿼리 안에서 순위 → 등급 라벨 0..(n-1)
    order = np.argsort(np.argsort(utils))
    return rows, list(order.astype(int)), utils


def _synth_dataset(n_queries, seed):
    rng = np.random.default_rng(seed)
    X, y, groups, utils = [], [], [], []
    for _ in range(n_queries):
        rows, labels, us = _synth_query(rng)
        X += rows
        y += labels
        groups.append(len(rows))
        utils += us
    return np.array(X, float), np.array(y, int), np.array(groups), np.array(utils)


# ── 학습 + 평가 ─────────────────────────────────────────────
def _ndcg_by_group(y_true, y_score, groups, k=3):
    from sklearn.metrics import ndcg_score
    out, i = [], 0
    for g in groups:
        yt, ys = y_true[i:i + g], y_score[i:i + g]
        i += g
        if g >= 2:
            out.append(ndcg_score([yt], [ys], k=min(k, g)))
    return float(np.mean(out))


def _rule_score(X):
    """baseline: weighting.condition_score 와 같은 선형 가중평균 (feature 로 재현)."""
    sub = X[:, :len(SUB_KEYS)]
    w = X[:, len(SUB_KEYS):]
    wmap = {"distance": w[:, 0], "elevation": w[:, 1], "toilet": w[:, 2],
            "store": w[:, 3], "park": w[:, 4], "night": w[:, 5]}
    key = {"distance": "distance", "elevation": "elevation", "toilet": "toilet",
           "store": "store", "park": "park", "water": "park",
           "streetlight": "night", "cctv": "night",
           "surface": None, "flow": None, "overlap": None}
    num = np.zeros(len(X))
    den = np.zeros(len(X))
    for j, k in enumerate(SUB_KEYS):
        col = np.nan_to_num(sub[:, j], nan=50.0)
        wt = wmap[key[k]] if key[k] else np.full(len(X), 2.0)
        num += col * wt
        den += wt
    return num / den


def train(out_path=MODEL_PATH, seed=0):
    import lightgbm as lgb

    Xtr, ytr, gtr, _ = _synth_dataset(500, seed)
    Xte, yte, gte, ute = _synth_dataset(150, seed + 1)

    model = lgb.LGBMRanker(
        objective="lambdarank", n_estimators=400, learning_rate=0.05,
        num_leaves=31, min_child_samples=20, subsample=0.8,
        colsample_bytree=0.8, random_state=seed, verbose=-1,
    )
    model.fit(Xtr, ytr, group=gtr)
    model.booster_.save_model(str(out_path))

    ml = model.predict(Xte)
    rule = _rule_score(Xte)
    # '진짜 선호도(ute)' 를 정답으로, ML vs 규칙 랭킹 품질 비교
    n_ml = _ndcg_by_group(ute, ml, gte)
    n_rule = _ndcg_by_group(ute, rule, gte)
    print(f"NDCG@3  (합성 '진짜 선호도' 기준)")
    print(f"  규칙 기반(conditionScore) : {n_rule:.4f}")
    print(f"  학습 랭커(LightGBM)       : {n_ml:.4f}")
    print(f"  개선폭                    : {n_ml - n_rule:+.4f}")
    print(f"\n저장: {out_path}")
    imp = sorted(zip(FEATURE_NAMES, model.feature_importances_),
                 key=lambda t: -t[1])[:6]
    print("상위 feature:", [f"{n}({v})" for n, v in imp])


if __name__ == "__main__":
    train()
