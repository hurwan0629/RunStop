# networkx 사용
import networkx as nx

G = nx.MultiDiGraph()

G.add_node("A", x=127.0, y=37.5)
G.add_node("B", x=127.0, y=37.5)
G.add_node("C", x=127.02, y=37.52)

G.add_edge("A", "B", length=100)
G.add_edge("B", "C", length=150)
G.add_edge("C", "A", length=400)

print(G.nodes)
print(G.edges(data=True))


G.add_node("D", x=127.9, y=37.4)

print(G.nodes)
print(G.edges(data=True))

G.add_edge("C", "A", length=500)

print(G.edges(data=True))
print(G.edges())

def weight(u, v, edge_data):
    print("u:", u)
    print("v:", v)
    print("edge_data:", edge_data)
    # edge_data를 받아서 values를 받는데 그게 뭐인거지?
    return min(data["length"] * 2 for data in edge_data.values())

print(nx.shortest_path(G, "A", "C", weight=weight))
print(nx.shortest_path(G, "A", "C", weight=lambda u, v, edge_data: min(data["length"] * 2 for data in edge_data.values())))
