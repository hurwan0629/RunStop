`2026-09-06`기준

### 데이터 형태

우선 자주 쓰이는 데이터 형태를 정의하면

#### G `NetworkX.MultiDiGraph`

OSM 라이브러리 에서 제공하는 모든 노드(위경도)와 그 노드를 잇는 edge 데이터로 이루어져 있는 객체입니다.



## 요청 형태

현재 재빈님이 짜주신 알고리즘이 기대하는 요청 데이터 형태는 다음과 같습니다.

```json
{
	// 상위 몇개를 줄 것인가에 대한 수치
	// 알고리즘 내부적으로 정해진 pool 개수만큼 값이 제한됨.
	"top_k": 3,
	// LOOP[순환], ROUND_TRIP[왕복], ONE_WAY[단방향]
	"route_type": "LOOP",
	"start": {
		"lat": 37.4979,
		"lon": 127.0276
	},
	// 원하는 거리 fastapi 서버쪽에서 km 단위로 변형해줘야함
	"target_km": 5.0, //
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
	// // // // // // // // // // // // // // // // // // // // // // // //
	//                       가변적으로 받는 값                            //
	// // // // // // // // // // // // // // // // // // // // // // // //
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
}
```

### 응답 형태

```json
// 요청 데이터에 존재하는 top_k 만큼의 데이터를 반환하게 됨
// 하지만 최초에 시도하는 경로로 목표 거리 충족하면 바로 반환하게 됨.
[
	{
		// // // // // // // // // // // // // // // // // // // // // // // //
		//                [generate_course*() 에서 정해지는 값]                //
		// // // // // // // // // // // // // // // // // // // // // // // //
		// 적용된 모드
		// 경유지가 없는 경우에는 loop, out_and_back, point_to_point
		// 경유지가 있는 경우에는 반드시 via
	    "mode": "loop",
	    // 최종 실제 거리
	    "target_distance_m": 5000,
	    // 실제 산출된 edge length 합
	    "actual_distance_m": 4920,
	    // 거리 오차 비율 (%)
	    "distance_error_pct": 1.6,
	    // 중복된 edge(경로) 비율
	    "overlap_ratio": 0.12,
	    // 거리를 조정하기 위한 FP_1 + FP_2 (두 초점과 타원위의 거리합)을 반환
	    "scale_m": 2400,
		
		// 실제로 지나가는 위경도들
	    "coords": [
	        (37.5, 127.0),
	        (37.501, 127.002),
	    ],

		// // // // // // // // // // // // // // // // // // // // // // // //
		//                    [recommend() 에서 정해지는 값]                   //
		// // // // // // // // // // // // // // // // // // // // // // // //
	    // DEM 기반 경사 정보
	    "slope": {
			// DEM 값이 없으면 null
			"avg_slope_pct": 2.31,
			// DEM 값이 없으면 null
			"max_slope_pct": 7.42,
			// 누적 상승 고도(m), DEM 값이 없으면 null
			"elevation_gain_m": 34.5,
			// 고도 측정을 위해 샘플링한 점 개수
			"sample_count": 154
	    },
	
	    // 경로 주변 시설 정보
	    "facilities": {
			// 실제 경로 길이(km)
			"route_length_km": 4.93,
	
			// 시설 검색에 사용한 경로 주변 buffer 크기(m)
			"buffer_m": 100,
	
			"toilet_count": 2,
			"toilet_per_km": 0.41,
			// 주변 후보가 없으면 null
			"toilet_nearest_m": 42.3,
	
			"store_count": 5,
			"store_per_km": 1.01,
			"store_nearest_m": 21.7,
	
			"park_count": 1,
			"park_per_km": 0.2,
			"park_nearest_m": 63.1,
	
			"light_count": 40,
			"light_per_km": 8.11,
			"light_nearest_m": 4.2,
	
			"security_count": 13,
			"security_per_km": 2.64,
			"security_nearest_m": 7.8,
	
			"walklight_count": 6,
			"walklight_per_km": 1.22,
			"walklight_nearest_m": 12.1,
	
			"cctv_count": 8,
			"cctv_per_km": 1.62,
			"cctv_nearest_m": 18.4
	    },
	
	    // GeoPandas + polygon 데이터 기반 자연환경 인접률
	    "nature": {
			// 해당 GeoJSON 데이터가 없으면 null
			"park_ratio": 0.132,
			// 해당 GeoJSON 데이터가 없으면 null
			"water_ratio": 0.041
	    },
	
	    // OSM Graph의 highway/노드 속성 기반 정보
	    "surface": {
			// 경로 길이(m)
			"length_m": 4932,
	
			// highway 정보가 없으면 null
			"walkable_ratio": 0.82,
	
			// highway 정보가 없으면 null
			"bigroad_ratio": 0.09,
	
			// highway=steps 구간 개수
			"stairs_count": 0,
	
			// highway 정보가 없으면 null
			"signal_per_km": 1.42,
	
			// highway 정보가 없으면 null
			"crossing_per_km": 2.23
	    },

		// // // // // // // // // // // // // // // // // // // // // // // //
		//                    [recommend() 에서 정해지는 값]                   //
		// // // // // // // // // // // // // // // // // // // // // // // //
	    // 위 실제 feature들을 0~100 점수로 변환한 값
	    "sub_scores": {
			"distance": 86.0,
	
			// DEM이 없으면 null이 아니라 현재 코드에서는 중립값 50.0
			"elevation": 72.4,
	
			"toilet": 100.0,
			"store": 100.0,
	
			// 관련 공간 데이터가 없으면 null 가능
			"park": 88.0,
			"water": 27.3,
	
			"streetlight": 67.2,
			"cctv": 10.8,
	
			// OSM highway 정보가 없으면 null 가능
			"surface": 81.4,
	
			// 신호등 정보 계산 불가 시 null 가능
			"flow": 64.5,
	
			// out_and_back인 경우 null
			"overlap": 60.0
	    },
	
	    // sub_scores × weights로 계산한 최종 조건 점수
	    "condition_score": 78.4,
	
	    // requirements 중 충족하지 못한 조건들
	    // 모두 만족하면 []
	    "failed_conditions": [
			"화장실 최소 1곳"
	    ],
	
	    // requirements + 거리 조건을 전부 만족했는지
	    "exact_match": false,
	
	    // 현재 6분/km 기준 예상 시간(분)
	    "estimated_minutes": 30
	  }
	}
]
```

