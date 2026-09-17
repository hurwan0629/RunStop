from scipy.spatial import cKDTree
import numpy as np
import math

graph = np.empty((0, 2))
print(graph)
print(graph.shape)

for i in range(5, 101, 5):
    for j in range(5, 101, 5):
        ad = np.array([i, j])
        # print(graph.shape)
        # print(ad.shape)
        graph = np.vstack([graph, ad])

print(graph)


idx = cKDTree(graph)

result = idx.query([3, 7])
print(graph[result[1]])

