"""요청 안에서 utility가 더 높은 후보 쌍을 만듭니다."""
import numpy as np


def preference_pairs(frame):
    """pairwise 학습에 사용할 (좋은 후보 index, 나쁜 후보 index) 배열을 반환합니다."""
    left, right = [], []
    # request_id가 같은 후보끼리만 비교해서 요청 간 label 누수를 막습니다.
    # 전체 데이터프레임을 [1:N=요청:후보]로 묶어줍니다. 그리고 indices를 이용해서 각 그룹에 속한 행 위치를 반환합니다.
    for positions in frame.groupby("request_id", sort=False).indices.values():
        # ▲ positions는 하나의 요청에 대한 여러 요청 후보가 있는 list[cand_index]입니다.
        
        # 해당 요청들에 대한 인덱스 행에 존재하는 `utility` 점수를 뽑아줍니다.
        values = frame.iloc[positions].utility.to_numpy()

        # utility 점수를 기반으로 
        # values[:, None] = bool_mask: (len(cands), 1)  - 열벡터
        # values[None, :] = bool_mask: (1, len(cands))  - 행벡터
        # 을 받아줍니다.
        # 이를 비교 연산을 하게 되면 브로드캐스팅을 통해 [len]x[len] 크기의 행렬이 나옵니다.
        # 이를 반환하면 True인 부분의 인덱스만 나와서 i가 행, j가 열을 받게 됩니다.
        # 이는 열부분이 더 큰 값의 인덱스이기 때문에 left가 더 크다고 판단하고 right에는 더 작다고 판단합니다.
        i, j = np.where(values[:, None] > values[None, :])

        # 예를 들어서 [0.9, 0.6, 0.2] 가 들어가면
        # [[0, 1], [0, 2], [1, 2]]가 반환되어서 각각 
        # i=[0, 0, 1]
        # j=[1, 2, 2]
        # 가 된다고 볼 수 있습니다.
        left.extend(positions[i])
        right.extend(positions[j])
    return np.asarray(left, dtype=int), np.asarray(right, dtype=int)
