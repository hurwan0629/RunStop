# 파이썬 워커 프로젝트

## 사용자 조건에 따른 후보 생성

- 시설·자연환경·야간 조건에 맞는 내부 기준점 후보를 기존 방향 후보와 함께 생성한다. 기존 경로 생성/Dijkstra와 AI artifact는 유지한다.
- DEM을 탐색 경사에 연결한다. 완만은 평지 우선, `NORMAL`(약간 경사짐)은 적당한 오르내림을 선호한다. 최대 경사는 기존 5%/8%와 Node의 단계적 완화를 사용한다.
- 실행 결과와 호환성·재현 명령: [수정 및 검증 문서](../docs/2026-09-19-route-preferences.md).

## 편도 후보와 기록 분석

- `point_to_point`는 타원 측면의 70°·90°·110° / 250°·270°·290° 경유점을 탐색한다. 두 끝점 방향은 사용하지 않으며, 거리·겹침 검사와 중복 제거를 통과한 후보만 기존 순위 결정으로 넘긴다. 실제 반환 개수는 도로망과 조건에 따라 3개보다 적을 수 있다.
- `POST /routes/analyze-track`는 Node 서버가 전달한 `{ segments: [[{lat, lng}, ...], ...] }`를 시설·경사·녹지/하천 데이터로 분석한다. 경로 생성과 AI 추천은 호출하지 않는다.
- 변경 검증: `python -m unittest discover -s tests -v`.

- 단순 HTTP 서버 컨테이너로 설계하였으며 특별한 서버 구조로 만들지 않을 계획입니다.
- 포트는 외부에 노출하지 않고 Node 서버와의 통신만 가능하게 설정할 것입니다.
- 메시지 큐 등을 고려하였으나 기술비용 문제에 의해 기각하였습니다.

## 사용 환경
- `python`: 3.12
- 
## 폴더 구조
> 폴더 구조는 임의로 설계해놓았습니다.
```
├─ routing-worker/        # Python 경로 생성 / AI Worker
│  │ 
│  ├─ Dockerfile          # Python Worker 이미지 빌드
│  │ 
│  ├─ src/
│  │  ├─ app.py           # FastAPI 진입점
│  │  ├─ api/
│  │  │  └─ routes.py     # /route, /health 같은 엔드포인트
|  |  ├─ services/        # algorithm → feature → ranking 흐름 조합
│  │  ├─ worker.py        # Node 요청을 받는 Worker 진입점
│  │  ├─ algorithm/       # Dijkstra 등 경로 후보 생성
│  │  ├─ features/        # 경사도, 시설 수 등 Route Feature 계산
│  │  └─ ranking/         # 후보 경로 점수화 / Top3 선택
│  │ 
│  ├─ preprocessing/      # CSV/SHP 정제, 좌표계 변환 등 사전 처리 파이프라인
│  ├─ inference/          # 학습된 AI 모델 추론 코드
│  ├─ training/           # AI 모델 학습 코드
│  ├─ models/             # 모델 정의 또는 저장된 weight
│  ├─ utils/              # 공통 Python 유틸리티
│  │ 
│  └─ requirements.txt    # Python 의존성
```
