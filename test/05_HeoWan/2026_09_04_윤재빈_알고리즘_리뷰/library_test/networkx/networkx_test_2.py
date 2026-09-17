import networkx as nx

G = nx.MultiDiGraph()

G.add_node("start", open=True)
G.add_node("A", open=True, a=1, b=2, hello={"name": "hurwan", "age": 12}, )

G.add_node("B", open=True)
G.add_node("C", open=True)
G.add_node("D", open=False)
G.add_node("goal", open=True)

G.add_edge("start", "A", length=10)
G.add_edge("start", "D", length=15)
G.add_edge("A", "B", length=10, hard=True)
G.add_edge("B", "C", length=20, hard=True)
G.add_edge("C", "goal", length=20)
G.add_edge("D", "goal", length=10, hard=False)
G.add_edge("D", "goal", length=13, hard=True)

# def weight(u, v, edge_data):
#     if u.get("open") == False:
#         return float("inf")
#     return [data["length"] * (1 if data[]) for data in edge_data.values()]

print(G)

print(G.nodes["A"])

print([data for data in G.successors("A")])

print([data for data in G.predecessors("goal")])

queue = [node for node in G.predecessors("goal")]
print(f"from goal:", queue)

for node in queue:
    connected = [node for node in G.predecessors(node)]
    print(f"from {node}:", connected)
    queue += connected
    # print("queue:", queue)

print("A to goal", G.get_edge_data("A", "goal"))
print("D to goal", G.get_edge_data("D", "goal"))

print("start neighbors", [n for n in G.neighbors("start")])

print(G.has_node("end"))

print(G.has_edge("goal", "D"))
print(G.has_edge("D", "goal"))

print("=====")

# data = G.get_edge_data("A", "B")
# print(data)
# data[0]["hard"] = False
# print(data)

data = G["A"].get("B").get(0)
print(data)
data["length"] = 300
print(G["A"])

# print("from A")
# print("degree:", G.degree("A"))
# print("neighbors:", [n for n in G.neighbors("A")])
# print("out_degree:", G.out_degree("A"))
# print([node for node in G.successors("A")])
# print("in_degree:", G.in_degree("A"))
# print([node for node in G.predecessors("A")])
#
# # nx.shortest_path(
# # #     G
# # # )
#
# count = 0
#
# def weight(u, v, edge_data):
#     global count
#     print("count:", count)
#     count+=1
#     print("u:", u)
#     print("v:", v)
#     print(G.nodes[v])
#     print("edge_data:", edge_data)
#
#     return min([
#         data["length"] * (2 if data.get("hard", False) else 1)
#         for data
#         in edge_data.values() if G.nodes[v]["open"]
#     ] + [float("inf")])
#
# print(nx.shortest_path(G, "start", "goal", weight=weight))
#
