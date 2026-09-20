# 노드 API 서버 프로젝트

## 추천 조건과 기록 상세

- 새 선택은 optional `slopePreference`, `preferNature`, `preferFlow`로 받아 기존 weights/maxSlope로 정규화한다. `NORMAL` 표시명은 약간 경사짐이다.
- 기록 상세에는 기존 요청 조건과 선택 코스의 `featureValues`를 추가 조회한다. 관리자 요청 비교는 `GET /api/admin/route-requests/:requestIdx`를 사용한다.
- 신규 DB migration 없이 기존 JSON과 관계를 재사용한다. [변경·실험·배포 안내](../docs/2026-09-19-route-preferences.md).

## 러닝 지도·구간 조회

- 사용자: `GET /api/running-sessions/:sessionIdx/detail` (본인 기록만).
- 관리자: `GET /api/admin/running-sessions`, `GET /api/admin/running-sessions/:sessionIdx`, `GET /api/admin/running-analytics`.
- 관리자 목록·통계는 `from`, `to` 날짜를 한국 시간 기준으로 받는다. 최대 366일, 목록은 `userIdx`와 `page`로 필터링한다.
- 상세 응답은 선택 코스, 실제 GPS 경로, 1km 및 잔여 구간의 시간·페이스·환경 분석을 포함한다. 정확도 50m 초과 지점은 제외하고, 120초 초과 단절·역전 시간·12m/s 초과 이동은 연결하지 않는다. 제외 기준 때문에 기존 저장 요약 거리와 구간 거리 합이 다를 수 있다.
- 완료 기록의 환경 분석은 워커 `/routes/analyze-track`에서 수행하고 GPS 경로 해시와 함께 캐시한다. 워커 장애 시 경로와 페이스만 제공하며 다음 조회에 재시도한다.
- 추천 저장은 기존 최대 3개 정책 그대로다. 관리자 비교 대상은 해당 러닝의 선택 코스와 같은 요청에서 저장된 다른 추천만이며, 탈락 후보·실패 요청은 추가 저장하지 않는다.

배포 전 `backend/`에서 `npm run db:migrate`로 `1789770000000_add-running-track-analysis.js`를 적용한다. 이 명령은 설정된 `DATABASE_URL`의 DB를 대상으로 한다. 워커도 함께 업데이트해야 구간 환경 정보를 조회할 수 있다.

검증: `npm test -- --run test/running-detail.test.ts` 및 `npm run build`.

## 폴더 구조
> 폴더 구조는 임의로 설계해두었습니다.
```
├─ backend/                          # Node.js + TypeScript API 서버
│  ├─ Dockerfile                     # Node 서버 이미지 빌드
│  ├─ src/
│  │  ├─ server.ts                   # 서버 진입점
│  │  ├─ routes/                     # Express API 라우트
│  │  ├─ services/                   # 서비스 비즈니스 로직
│  │  ├─ repositories/               # DB 접근 계층
│  │  ├─ adapters/                   # TMAP, SMS, LLM 등 외부 API 연결
│  │  ├─ dto/                        # 요청/응답 DTO
│  │  ├─ config/                     # 환경변수 및 서버 설정
│  │  └─ middleware/                 # 로깅, 인증, 전역 예외 처리
│  ├─ package.json
│  └─ tsconfig.json
```

### 라이브러리 다운
```bash
npm install zod pg pino pino-http helmet express jsonwebtoken bcrypt dotenv 
npm install -D typescript @types/node @types/express cross-env @types/jsonwebtoken @types/bcrypt @types/pg tsx vitest node-pg-migrate
```

### 스크립트
```json
"scripts": {
  "dev": "",
  "test": "cross-env NODE_ENV=test vitest",
  "build": "",
  "start": "",
  "typecheck": ""
},
```
