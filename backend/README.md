# 노드 API 서버 프로젝트

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
npm install -D typescript @types/node @types/express cross-env @types/jsonwebtoken @types/bcrypt @types/pg tsx
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