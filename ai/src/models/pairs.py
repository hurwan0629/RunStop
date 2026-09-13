import numpy as np


def preference_pairs(frame):
    left, right = [], []
    for positions in frame.groupby("request_id", sort=False).indices.values():
        values = frame.iloc[positions].utility.to_numpy()
        i, j = np.where(values[:, None] > values[None, :])
        left.extend(positions[i])
        right.extend(positions[j])
    return np.asarray(left, dtype=int), np.asarray(right, dtype=int)
