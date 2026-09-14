"""사용자 단위 cold split과 사용자 내부 시간순 warm split을 만듭니다."""
import numpy as np


def split_user_temporal_holdout(df, config):
    """요청을 train/validation/warm_start/cold_start로 누수 없이 나눕니다."""
    # request 단위 목록을 만들고 cold-start 사용자 집합을 고정 seed로 뽑습니다.
    requests = df[["user_id", "request_id", "request_sequence"]].drop_duplicates().copy()
    users = sorted(requests.user_id.unique())
    if len(users) < 2:
        raise ValueError("At least two users are required for Warm/Cold splitting")
    shuffled = np.random.default_rng(config.seed).permutation(users)
    n_cold = max(1, min(len(users) - 1, int(len(users) * config.cold_user_ratio)))
    cold = set(shuffled[:n_cold])

    # cold 사용자는 통째로 cold_start, 나머지는 사용자 내부 요청 순서로 나눕니다.
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

    # 원본 후보 행을 split별로 다시 모으고 누수 여부를 검사합니다.
    requests["split"] = requests.request_id.map(assignment)
    parts = {key: df[df.request_id.isin(requests.loc[requests.split == key, "request_id"])].copy()
             for key in ("train", "validation", "warm_start", "cold_start")}
    if any(part.empty for part in parts.values()):
        raise ValueError("Split produced an empty train/validation/warm/cold set; inspect valid request counts")
    assert_no_leakage(parts)
    return parts, requests


def assert_no_leakage(parts):
    """요청 중복, cold 사용자 섞임, 시간순 역전을 검사합니다."""
    # 같은 request_id가 둘 이상의 split에 들어가지 않았는지 확인합니다.
    seen = set()
    for part in parts.values():
        ids = set(part.request_id)
        if ids & seen:
            raise ValueError("Request leakage")
        seen |= ids

    # cold_start 사용자가 train/validation/warm_start에 섞이면 안 됩니다.
    known = set(parts["train"].user_id) | set(parts["validation"].user_id) | set(parts["warm_start"].user_id)
    if known & set(parts["cold_start"].user_id):
        raise ValueError("Cold user leakage")

    # warm 사용자의 train -> validation -> warm_start 순서가 유지되는지 봅니다.
    for uid, group in parts["train"].groupby("user_id"):
        val = parts["validation"].loc[parts["validation"].user_id == uid, "request_sequence"]
        test = parts["warm_start"].loc[parts["warm_start"].user_id == uid, "request_sequence"]
        if val.empty or test.empty or not group.request_sequence.max() < val.min() <= val.max() < test.min():
            raise ValueError("Temporal leakage")
