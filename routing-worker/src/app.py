from fastapi import FastAPI
from .dto.recommend import RouteRecommendRequestDTO
from .dto.parser import parse_node_request_to_python_recommendation, parse_python_recommendation_to_node_require
from .algorithm.pipeline import recommend
from .algorithm.graph import load_graph, grid_graph, NodeIndex
from pathlib import Path

graphml = Path(__file__).parent / "algorithm" / "data" / "서울_보행네트워크.graphml"
# 그래프 파일이 존재하면 
if graphml.exists():
    # 그래프 도로망 데이터를 불러와주기
    print(f"[그래프] 실제 서울 도로망: {graphml.name}")
    # 그래프 객체를 만든다음에 `기존 이름.pkl` 형태로 변환해서 저장해주기
    G = load_graph(str(graphml))
else:
    # 그래프 파일이 없다면 
    print("[그래프] 격자 (build_graph.py 로 실제 그래프 빌드 가능)")
    G = grid_graph(90, 90, 100, origin=(37.475, 126.985))

# G의 인덱스를 캐싱하여 (lat, lon)을 넣으면 가장 가까운 인덱스를 반환해주는 idx 노드 인덱스 객체를 가져와주기
idx = NodeIndex(G)


app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/routes/recommend")
def route_recommend(request: RouteRecommendRequestDTO):

    print("raw request:", request.model_dump())
    # Node에서 주는 요청을 파이썬 형태에 맞게 만들어주기
    recommend_args = parse_node_request_to_python_recommendation(request)

    print("\nrecommend_args:", recommend_args) 

    cands = recommend(
        G, 
        idx, 
        recommend_args["route_type"], 
        recommend_args["start"], 
        recommend_args["target_km"], 
        end=recommend_args.get("end", None), 
        vias=recommend_args.get("vias", None),
        weights=recommend_args.get("weights", None), 
        requirements=recommend_args.get("requirements", None), 
        # 후보군을 만들 방위각 개수 (360 / n_directions)
        n_directions=12,
        # 뽑을 후보군 개수
        top_k=3
    )

    print("\ncands:", cands)

    response = parse_python_recommendation_to_node_require(cands)

    return { "candidates": response}