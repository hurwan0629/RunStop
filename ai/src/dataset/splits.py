import numpy as np


def split_user_temporal_holdout(df, config):
    requests = df[["user_id", "request_id", "request_sequence"]].drop_duplicates().copy()
    users = sorted(requests.user_id.unique())
    if len(users) < 2:
        raise ValueError("At least two users are required for Warm/Cold splitting")
    shuffled = np.random.default_rng(config.seed).permutation(users)
    n_cold = max(1, min(len(users) - 1, int(len(users) * config.cold_user_ratio)))
    cold = set(shuffled[:n_cold])
    assignment = {}
    minimum = config.validation_requests + config.test_requests + config.min_train_requests
    for uid, group in requests.groupby("user_id", sort=True):
        ordered = group.sort_values(["request_sequence", "request_id"]).request_id.tolist()
        if uid in cold:
            assignment.update(dict.fromkeys(ordered, "cold_start"))
        elif len(ordered) < minimum:
            if config.insufficient_user == "error":
                raise ValueError(f"{uid}: requires {minimum} valid requests, got {len(ordered)}")
            assignment.update(dict.fromkeys(ordered, "excluded"))
        else:
            train_end = len(ordered) - config.validation_requests - config.test_requests
            val_end = len(ordered) - config.test_requests
            assignment.update(dict.fromkeys(ordered[:train_end], "train"))
            assignment.update(dict.fromkeys(ordered[train_end:val_end], "validation"))
            assignment.update(dict.fromkeys(ordered[val_end:], "warm_start"))
    requests["split"] = requests.request_id.map(assignment)
    parts = {key: df[df.request_id.isin(requests.loc[requests.split == key, "request_id"])].copy()
             for key in ("train", "validation", "warm_start", "cold_start")}
    if any(part.empty for part in parts.values()):
        raise ValueError("Split produced an empty train/validation/warm/cold set; inspect valid request counts")
    assert_no_leakage(parts)
    return parts, requests


def assert_no_leakage(parts):
    seen = set()
    for part in parts.values():
        ids = set(part.request_id)
        if ids & seen:
            raise ValueError("Request leakage")
        seen |= ids
    known = set(parts["train"].user_id) | set(parts["validation"].user_id) | set(parts["warm_start"].user_id)
    if known & set(parts["cold_start"].user_id):
        raise ValueError("Cold user leakage")
    for uid, group in parts["train"].groupby("user_id"):
        val = parts["validation"].loc[parts["validation"].user_id == uid, "request_sequence"]
        test = parts["warm_start"].loc[parts["warm_start"].user_id == uid, "request_sequence"]
        if val.empty or test.empty or not group.request_sequence.max() < val.min() <= val.max() < test.min():
            raise ValueError("Temporal leakage")
