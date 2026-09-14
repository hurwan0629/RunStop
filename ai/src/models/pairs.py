"""요청 안에서 utility가 더 높은 후보 쌍을 만듭니다."""
import numpy as np


def preference_pairs(frame):
    """pairwise 학습에 사용할 (좋은 후보 index, 나쁜 후보 index) 배열을 반환합니다."""
    left, right = [], []
    # request_id가 같은 후보끼리만 비교해서 요청 간 label 누수를 막습니다.
    for positions in frame.groupby("request_id", sort=False).indices.values():
        values = frame.iloc[positions].utility.to_numpy()
        i, j = np.where(values[:, None] > values[None, :])
        left.extend(positions[i])
        right.extend(positions[j])
    return np.asarray(left, dtype=int), np.asarray(right, dtype=int)
