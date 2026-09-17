# RunStop

> 화장실·편의점·경사도·야간 인프라 등 다양한 공간 데이터를 반영한 맞춤형 러닝 코스 추천 서비스

RunStop은 사용자의 러닝 조건과 주변 공간 데이터를 함께 활용하여  
**단순 최단 경로가 아니라 실제로 달리기 좋은 경로를 추천하는 것**을 목표로 하는 프로젝트입니다.

현재는 초기 기획 단계를 지나 **서비스 아키텍처, 데이터/알고리즘, UI/UX의 인터페이스를 맞추고 개발 환경을 구축하는 단계**입니다.

---

## 📌 프로젝트 소개

사용자는 출발지와 원하는 러닝 조건을 입력하고, RunStop은 보행 가능한 경로와 여러 공간 데이터를 분석하여 조건에 맞는 코스 후보를 제공합니다.

주요 고려 요소는 다음과 같습니다.

- 목표 거리
- 경사도 및 누적 상승고도
- 공중화장실
- 편의점
- 공원 및 주변 환경
- 가로등 / 보안등 / CCTV 등 야간 인프라
- 보행 가능한 경로
- 사용자가 입력한 추가 조건

예를 들어 다음과 같은 요청을 처리하는 것을 목표로 합니다.

```text
7km 정도 뛰고 싶어요.

오르막은 적었으면 좋겠고,
중간에 화장실이 있었으면 좋겠어요.

밤에 달릴 예정이라
가로등이 많은 길이면 좋겠어요.
```

사용자의 자연어 입력은 필요한 경우 LLM을 이용해 구조화된 조건으로 변환하고,  
경로 생성 및 평가 과정에서는 TMAP 보행 경로와 공공 공간 데이터를 함께 활용합니다.

---

## 🎯 프로젝트 목표

1. 사용자의 거리, 경사, 시설, 환경 조건을 반영한 러닝 코스 생성
2. 여러 후보 경로를 Feature 단위로 분석하고 비교
3. 최대 3개의 추천 코스를 사용자에게 제공
4. 실제 러닝 중 GPS 데이터를 기록하고 러닝 결과를 저장
5. 데이터 / 알고리즘 / UI / 서버가 독립적으로 개발되어도 쉽게 통합할 수 있는 구조 구성

---

## 🔄 현재 서비스 흐름

```text
회원가입 / 로그인
        ↓
사용자 정보 및 선호 설정
        ↓
러닝 조건 입력
        ↓
자연어 조건 구조화 및 입력 검증
        ↓
경로 생성 요청
        ↓
TMAP 및 공간 데이터 기반 후보 경로 생성
        ↓
Route Feature 계산
        ↓
조건 검사 / 점수화 / Ranking
        ↓
추천 코스 최대 3개 제공
        ↓
사용자가 코스 선택
        ↓
러닝 시작
        ↓
GPS 기반 실제 이동 경로 기록
        ↓
러닝 종료 및 기록 저장
```

---

## 👥 역할 분담

| 담당자 | 담당 영역 |
|---|---|
| 윤재빈 / 박건희 | 데이터 분석, 전처리, 경로 생성 및 추천 알고리즘 |
| 최한빈 / 이승연 | UI/UX 설계 및 프론트 개발 |
| 허완 | 서비스 아키텍처 설계, 서버/DB/Worker 인터페이스, 프로젝트 문서화 |

각 영역은 독립적으로 작업하되, 최종 통합 시 충돌을 줄이기 위해 DTO와 인터페이스 규격을 먼저 맞추는 방향으로 진행합니다.

---

## 🧱 현재 서비스 아키텍처

현재 서버는 **Node.js Backend / Python Routing Worker / PostgreSQL + PostGIS**를 분리하는 방향으로 설계하고 있습니다.

```text
React Native App
        │
        │ HTTP / JSON
        ▼
Node.js + TypeScript Backend
        │
        ├──────────────► PostgreSQL + PostGIS
        │                  서비스 데이터
        │                  공간 데이터
        │                  경로 / GPS
        │
        │ Internal HTTP / JSON
        ▼
Python + FastAPI Routing Worker
        │
        ├─ algorithm
        ├─ features
        ├─ ranking
        └─ AI inference
```

Docker 환경에서는 다음 3개 서비스를 독립 컨테이너로 구성합니다.

```text
docker-compose
├─ backend
│  └─ Node.js + TypeScript
│
├─ routing-worker
│  └─ Python + FastAPI
│
└─ database
   └─ PostgreSQL + PostGIS
```

React Native 애플리케이션은 Docker Compose에 포함하지 않고 Android / iOS 앱으로 별도 빌드합니다.

### Node Backend

담당 영역:

- 외부 REST API
- 회원가입 / 로그인 / 인증
- 요청 검증
- 서비스 흐름 제어
- DB 접근
- TMAP / LLM / SMS 등 외부 API Adapter
- Python Worker 호출
- 공통 오류 처리 및 로깅

### Python Routing Worker

담당 영역:

- 후보 경로 생성 알고리즘
- Route Feature 계산
- 후보 경로 점수화 및 Ranking
- AI 모델 추론
- 데이터 전처리 코드 및 알고리즘 실험

FastAPI는 외부 사용자용 메인 API 서버가 아니라  
**Node Backend와 Python 알고리즘 사이의 내부 인터페이스**로 사용합니다.

### PostgreSQL + PostGIS

담당 영역:

- 사용자 및 서비스 데이터
- 경로 데이터
- GPS Trackpoint
- 공공 공간 데이터
- Point / LineString / Polygon 공간 연산
- 거리 / Buffer / 교차 / 인접 시설 Query

---

## 🛠️ 기술 스택 및 버전

현재 프로젝트 설계 기준입니다.  
아직 실제 구현이 시작되지 않았거나 팀에서 최종 확정하지 않은 항목은 `TBD`로 표시합니다.

| 영역 | 기술 | 버전 / 기준 |
|---|---|---|
| Frontend | React Native | TBD |
| Frontend | TypeScript | TBD |
| Backend Runtime | Node.js | 24.18.0 |
| Package Manager | npm | 11.16.0 |
| Backend | Express | 5.x |
| Backend | TypeScript | TBD |
| Validation | Zod | 4.x |
| Database Driver | pg | 8.x |
| Logging | Pino / pino-http | 10.x / 11.x |
| Security | Helmet | 8.x |
| Authentication | JWT / bcrypt | jsonwebtoken 9.x / bcrypt 6.x 기준 검토 |
| Worker Runtime | Python | 3.12 |
| Worker API | FastAPI | TBD |
| Worker Server | Uvicorn | TBD |
| Database | PostgreSQL | 17 |
| Spatial Extension | PostGIS | 3.5 |
| Container | Docker / Docker Compose | 로컬 개발 환경 기준 |
| Test | Vitest / Supertest | TBD |

### 버전 관리 원칙

Node 버전은 다음 요소를 함께 이용해 통일하는 방향을 고려합니다.

```text
.nvmrc
package.json engines
package.json packageManager
Dockerfile FROM node:...
```

Python Worker는 현재 다음 이미지를 기준으로 합니다.

```dockerfile
FROM python:3.12-slim
```

React Native 버전은 프론트 개발 환경 확정 후 README에 반영할 예정입니다.

---

## 🗺️ 데이터 및 경로 처리

현재 활용을 검토하거나 정제 중인 주요 데이터는 다음과 같습니다.

| 데이터 | 주요 활용 |
|---|---|
| 공중화장실 | 경로 주변 화장실 수 / 접근 거리 |
| 편의점 | 경로 주변 편의시설 접근성 |
| 공원 | 공원 인접도 / 통과 여부 |
| 가로등 / 보안등 | 야간 조명 환경 |
| CCTV | 야간 안전 인프라 보조 지표 |
| 고도 / 등고선 | 경사도 / 누적 상승고도 계산 |
| 보행자 관련 공간 데이터 | 보행 가능 구간 분석 |
| TMAP 보행자 경로 API | 실제 보행 가능한 경로 생성 |

공공데이터는 단순 존재 여부만 사용하는 것이 아니라  
경로 단위의 `RouteFeature`로 변환하여 알고리즘이 사용할 수 있도록 구성합니다.

예:

```text
RouteFeature

distanceKm
distanceError
elevationGain
elevationScore
toiletCount
nearestToiletDistance
storeCount
nearestStoreDistance
parkScore
streetlightScore
cctvScore
```

---

## 🧭 좌표 및 공간 데이터 규칙

외부 통신에서는 다음 형식을 기본으로 사용합니다.

```json
{
  "latitude": 37.543,
  "longitude": 127.044
}
```

기본 좌표계:

```text
App / Backend / 외부 API
→ EPSG:4326
```

거리, Buffer 등 공간 연산이 필요한 경우:

```text
EPSG:4326
    ↓
EPSG:5179
```

GIS 객체 생성 시 좌표 순서는 일반적인 GIS 규칙에 맞춰 다음과 같이 사용합니다.

```text
API / JSON
latitude, longitude

GIS
longitude, latitude
```

경로는 기본적으로 `LineString`, 시설은 `Point`, 영역 데이터는 `Polygon` 형태로 관리하는 방향입니다.

---

## 🤖 AI / LLM 활용 방향

AI는 서비스 전체를 대신하는 형태가 아니라 필요한 구간에 선택적으로 적용합니다.

### LLM

주요 역할:

```text
사용자 자연어
        ↓
LLM
        ↓
구조화 JSON
        ↓
Backend 검증
        ↓
경로 추천 알고리즘
```

LLM 결과는 바로 신뢰하지 않고 서버에서 다시 검증합니다.

예:

```json
{
  "targetDistanceKm": 7,
  "slopePreference": "LOW",
  "requirements": {
    "toilet": true
  }
}
```

### 경로 생성 / 추천 AI

현재 다음 적용 가능성을 검토하고 있습니다.

- 기존 알고리즘으로 생성한 후보를 학습 데이터로 활용하는 경로 생성 모델
- Route Feature를 기반으로 후보 경로를 평가하는 추천 / Ranking 모델

프로젝트 범위와 학습 데이터 품질을 고려하여  
기존 알고리즘과 AI의 역할은 실제 구현 과정에서 조정할 예정입니다.

---

## 🔐 인증 정책 변경

초기에는 Google OAuth 단일 로그인을 검토했으나 현재는 다음 방향으로 변경하였습니다.

```text
자체 회원가입
        ↓
자체 로그인
        ↓
bcrypt 비밀번호 해싱
        ↓
JWT 기반 인증
```

현재 기준:

- 자체 회원가입 / 로그인
- JWT 기반 인증
- bcrypt 비밀번호 해싱
- 필요 시 전화번호 인증 추가 검토
- OAuth 계정 병합 정책은 현재 범위에서 제외

추가 보안 기능은 실제 구현 단계에서 필요성을 확인하며 적용합니다.

---

## 🔌 주요 인터페이스 방향

### Frontend → Backend

```text
React Native
    ↓ HTTP / JSON
Node Backend
```

외부 앱은 Python Worker나 DB에 직접 접근하지 않습니다.

### Backend → Python Worker

초기에는 Node `child_process`로 Python을 실행하는 방식도 PoC를 진행했으나,  
현재는 런타임 결합을 줄이기 위해 다음 구조로 변경하였습니다.

```text
Node Container
      ↓ Internal HTTP
FastAPI Worker Container
```

현재 선택 이유:

- Node / Python 런타임 분리
- Worker 독립 재시작
- Health Check 구성 용이
- Worker 수평 확장 가능성
- Docker 기반 통합 실행

메시지 큐와 Raw TCP 방식도 검토했지만 현재 프로젝트 규모와 기술 비용을 고려하여 사용하지 않습니다.

### Backend → TMAP

TMAP API Key는 모바일 앱에 직접 포함하지 않고 Backend에서 관리합니다.

```text
App
 ↓
Backend
 ↓
TmapAdapter
 ↓
TMAP API
```

TMAP 원본 응답은 내부 공통 Route 형식으로 변환한 뒤 알고리즘에서 사용합니다.

---

## 🗄️ DB 초기화 방향

새로운 환경에서도 프로젝트를 쉽게 실행할 수 있도록 다음 구조를 준비하고 있습니다.

```text
DB 생성
    ↓
Migration
    ↓
Seed
    ↓
CSV / SHP Import
```

예상 구조:

```text
infra/
└─ db/
   ├─ migrations/
   ├─ seeds/
   └─ imports/
```

반복 실행 시 데이터가 중복되거나 상태가 망가지지 않도록  
`UNIQUE`, `UPSERT`, `ON CONFLICT` 등을 이용한 멱등성을 고려합니다.

Migration 도구와 구체적인 자동화 방식은 아직 확정 전입니다.

---

## 📁 프로젝트 구조

현재 프로젝트는 다음과 같은 큰 구조를 기준으로 구성하고 있습니다.

```text
RunStop/
├─ backend/                 # Node.js + TypeScript API 서버
│  ├─ src/
│  │  ├─ routes/
│  │  ├─ services/
│  │  ├─ repositories/
│  │  ├─ adapters/
│  │  ├─ dto/
│  │  ├─ config/
│  │  └─ middleware/
│  └─ Dockerfile
│
├─ routing-worker/          # Python 경로 알고리즘 / AI Worker
│  ├─ src/
│  │  ├─ api/
│  │  ├─ services/
│  │  ├─ algorithm/
│  │  ├─ features/
│  │  └─ ranking/
│  ├─ preprocessing/
│  ├─ inference/
│  ├─ training/
│  ├─ models/
│  └─ Dockerfile
│
├─ frontend/                # React Native App
├─ data/                    # 원본 / 정제 데이터
├─ infra/                   # DB migration / seed / import 등
├─ notebooks/               # 데이터 / 모델 실험
├─ test/                    # 팀원별 기술 검증 / PoC
├─ docs/                    # 기획 / 설계 / 회의 / 명세
│
├─ docker-compose.yml
├─ .env.example
└─ README.md
```

일부 폴더는 인터페이스를 먼저 정의하기 위해 생성된 골격이며 구현이 진행되면서 변경될 수 있습니다.

---

## ⚙️ 개발 원칙

현재 프로젝트에서는 기능을 한꺼번에 구현한 뒤 마지막에 합치는 방식을 지양합니다.

```text
기술 가능 여부 확인
        ↓
작은 PoC
        ↓
인터페이스 정의
        ↓
구현
        ↓
작은 단위 통합 테스트
        ↓
최종 통합
```

서버 환경은 다음 순서로 준비하고 있습니다.

```text
Dockerfile / docker-compose
        ↓
환경변수
        ↓
DB migration / seed / import
        ↓
프로젝트 폴더 구조
        ↓
DTO / interface
        ↓
Repository / Adapter
        ↓
Worker 연결
        ↓
실제 서비스 로직
```

목표는 팀원이 Repository를 clone한 뒤 최대한 비슷한 환경에서 프로젝트를 실행할 수 있도록 하는 것입니다.

---

## 🕒 개발 기록

### 2026-08-23

- RunStop Repository 초기 구성
- 프로젝트 기획안 및 공공데이터 후보 정리
- 서비스 차별점, 기본 사용자 흐름, AI 활용 후보 정의

### 2026-08-25

- 사용자 플로우와 주요 화면 구조 구체화
- PostgreSQL + PostGIS 사용 방향 결정
- React Native / Node.js / Python Worker 기반 아키텍처 초안 작성
- 경로 생성 → Feature 계산 → Ranking 구조 정리
- 서비스 DB 초안 및 주요 도메인 데이터 정의

### 2026-08-26

- 경로 추천 API 및 DTO 구조 구체화
- `RouteRequest`, `Route`, `RouteFeature`, `RouteScore` 등 내부 데이터 규격 검토
- TMAP 응답을 내부 Route로 변환하는 Adapter 구조 정리
- EPSG:4326 / EPSG:5179 좌표계 사용 원칙 정리
- 프론트 화면과 백엔드 데이터의 불일치 항목 검토

### 2026-08-27

- PostGIS 기본 타입 / 함수 / 공간 Query 검증
- 팀 데이터 및 경사도 처리 모듈 테스트
- 프로젝트 전체 정책과 서비스 데이터 구조 통합 정리
- CSV / SHP 데이터의 DB 적재 및 활용 방식 검토

### 2026-08-28

- DB Schema 분리, Migration / Seed / Import 방향 검토
- Node와 Python의 DB 접근 권한 및 책임 범위 검토
- 서비스 API 명세와 데이터셋 DB 구성 방향 구체화

### 2026-08-29

- Node `child_process` 기반 Python Worker 통신 PoC 진행
- JSON 직렬화 / 오류 처리 / 프로세스 종료 처리 검증
- TypeScript 도입 및 DTO 타입 설계 검토
- 알고리즘 명세 문서 작성 프레임 구성
- 실제 서비스에서는 Python Worker를 독립 서비스로 분리하는 방향 확정

### 2026-08-30

- `backend / routing-worker / frontend / infra` 프로젝트 골격 구성
- Node Backend와 Python FastAPI Worker 분리
- Dockerfile / `.dockerignore` 작성 및 Docker Layer / Cache 검토
- Docker Compose로 Backend / Worker / PostGIS를 묶는 provisioning 구조 작성
- 환경변수 관리 규칙 정리
- Worker 통신 방식을 `Node → Internal HTTP → FastAPI` 구조로 변경
- Health Check, DB Migration / Seed / Import를 다음 구현 단계로 설정

---

## 📊 현재 진행 상태

```text
[완료/진행] 서비스 기획 및 요구사항 정리
[진행] UI/UX 구체화
[진행] 데이터 전처리 및 알고리즘 설계
[진행] 서비스 아키텍처 설계
[진행] Docker 기반 개발 환경 구성
[진행] PostGIS / TMAP / Worker 기술 검증
[예정] Backend / Worker 최소 Health Check 구현
[예정] Docker Compose 통합 실행 검증
[예정] Node → Worker → PostGIS 최소 수직 통합
[예정] DB Migration / Seed / Import 구현
[예정] API / DTO 최종 확정
[예정] 실제 서비스 기능 개발
[예정] 통합 및 현장 테스트
[예정] 배포
```

---

## 🚧 현재 주요 미확정 사항

- React Native 버전 및 지도 SDK 세부 구성
- API의 동기 / 비동기 추천 처리 방식
- Migration 도구
- AI 모델의 최종 적용 범위
- Route Feature 및 Ranking 공식
- Worker Scaling 필요 여부
- 실제 배포 환경

해당 사항은 PoC 및 실제 구현 결과를 기준으로 단계적으로 확정합니다.

---

## 📚 참고 문서

상세 설계 및 회의 내용은 `docs/` 폴더에서 관리합니다.

주요 문서 분류:

```text
docs/
├─ 01_기획
├─ 02_프로젝트_설계
├─ 03_프론트_UI_UX
├─ 04_API_EVENTS_명세
├─ 05_AI_구조_명세
├─ 06_datas
├─ summary
└─ 99_logs
```

README는 현재 프로젝트 상태를 빠르게 파악하기 위한 문서이며,  
세부 구현 규칙과 의사결정 과정은 각 설계 문서를 기준으로 관리합니다.
