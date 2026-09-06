`2026-09-06`기준

### 데이터 형태

우선 자주 쓰이는 데이터 형태를 정의하면

#### G `NetworkX.MultiDiGraph`

OSM 라이브러리 에서 제공하는 모든 노드(위경도)와 그 노드를 잇는 edge 데이터로 이루어져 있는 객체입니다.



## 요청 형태

현재 재빈님이 짜주신 알고리즘이 기대하는 요청 데이터 형태는 다음과 같습니다.

```json
{
	// LOOP[순환], ROUND_TRIP[왕복], ONE_WAY[단방향]
	"route_type": "LOOP",
	"start": {
		"lat": 37.4979,
		"lon": 127.0276
	},
	// 원하는 거리 fastapi 서버쪽에서 km 단위로 변형해줘야함
	"target_km": 5.0,
	// [optional] ONE_WAY일 경우에 반드시 있어야하는 지점
	// LOOP 와 ROUND_TRIP의 경우에는 사용되지 않음
	"end": {
		"lat": 37.4979,
		"lon": 127.0276
	},
	// [optional] 지나가야하는 사용자 지정 경유지
	"vias": [
		{
		"lat": 37.5045,
		"lon": 127.049
		}
	],
	// 후보 점수화에 쓰이는 데이터들
	"weights": {
		"distance": 5,
		"elevation": 4,
		"toilet": 5,
		"store": 2,
		"park": 3,
		"night": 5
	},
	// boolean으로 exact_match=boolean 을 선택할 때 사용함.
	// 내부적으로 buffer/bond
	"requirements": {
		"toilet": true,
		"no_stairs": true
	},
	"top_k": 3
}
```