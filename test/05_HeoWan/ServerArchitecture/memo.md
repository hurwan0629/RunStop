`2026-08-29 19:37:32` 

# [랭체인 중간프로젝트] 서버 아키텍처 준비 - 이식성을 고려한 설계
현재 `08/31`까지 팀원들이 작업을 쉽게 할 수 있게 서버쪽 아키텍처를 설계하는 기간을 가지려 합니다.

현재 다음과 같은 기능을 미리 생각중입니다.
- 데이터베이스 
  - 필요한 `.csv` 파일 `import`
  - `service` 스키마에 미리 넣기로 한 요소들을 넣습니다. (아래는 현재 임시 테이블 명 입니다.)
    - `users`
    - `user_profiles`
    - `inquery` (문의)
    - `point_bookmark` (경유지 즐겨찾기)
    - `running_goal` (사용자 목표)
    - `route_requests` (사용자의 러닝 코스 요청)
    - `running_session` (사용자의 러닝 상태 기록)
    - `running_trackpoint` (특정 주기별로 사용자 gps 및 상태 정보)
    - `route_recommendation` (경로 후보 추린거 3개)
    - `route_point` (경로 지점)
    - `route_bookmak` (경로 즐겨찾기)
- 서비스 자체 인증인가 기능
  - jwt 토큰 (React Native와 일치하는지 확인해야함)
  - bcrypt 해싱
  - 로테이션 키 (쓰면 아키텍처가 늘어서 고민중)
  - solapi/coolsms 전화번호 인증
  - 사용자 정보 받기 (신체정보 등)
- 로깅 및 전역 예외/에러 catch 기능
  - 팀원이 코드를 짜는 공간을 래퍼로 감싸서 로깅 및 예외를 기본적으로 잡을 수 있게 처리하고싶음
- 도커 자동화 (Dockerfile과 docker-compose를 이용하여 미리 배포가 되는 상태를 기반으로 늘려나가고싶음)
- 마이그레이션 및 `import`, `seed` (방법을 몰라서 공부해야하며 node/python 중 선택을 하거나 양쪽 모두 만들어야함)
- 레포지토리 계층 미리 만들어두기 (GIS 함수 사용을 위한 인터페이스와 같은 계층)
- 인터페이스 및 dto 먼저 만들어두기 (TypeScript)
- `package.json` 에 미리 개발용 스크립트 모두 짜놓기 (너무 과하게 말고, `dev`, `test`, `deploy`, `build` 정도 미리 고려중이며 `lint` 같은것도 할지 고민됨. TS 프로젝트는 거의 처음이지만 아마 tsx가 있기때문에 테스트나 개발은 문제 없을 것 같음.)
- node, npm 버전 통일화
- worker을 요청 수에 따라 늘려야할지 고민중
- tmap/gpt_api 는 어느정도 테스트 해야하긴 하지만 위의 것들이 선행되어야 할 예정
- aws/git actions 또는 무언가 중에서 뭘 써야할지 고민중

---

## 공부하면서 좋은 설계법 고려

### 1. 환경변수
환경변수의 경우에는 3가지로 
- `development`: 로컬DB, 자세한 로그, 개발 API Key를 사용할 수 있을 것 같습니다.
- `test`: 테스트 전용 DB, Monk API를 통한 프론트 도움, 테스트 보안 키 등
- `production`: 실제 DB/API Key와 구현된 API들, 진짜 필요한 로그들을 추려서 정리할 예정입니다.

> 스크립트의 `NODE_ENV`를 이용하여 `development`, `test`, `production`으로 나누어낼 생각입니다.

### 2. 마이그레이션
데이터베이스 마이그레이션은 **DDL**을 이용한 데이터베이스 버전관리인 것은 알지만 데이터베이스를 다루는 것은 뭔가 민감한 내용인 것 같아서 일단 피하고싶긴 하지만 해야한다면 공부를 해서 하려 합니다.

### 3. 멱등성
정적 파일을 DB에 올리는 `import`와 기본 데이터를 올리는 `seed` 쪽에서 관리를 하는 방법을 알야아할 것 같은데 멱등성이 *몇번 반복해서 실행해도 데이터에 문제가 생기지 않음* 과 같은 규칙인 것은 아는데 직접 해본적이 없어서 이것도 마이그레이션과 함께 볼 요소입니다.

다음과 같은 코드로 작업을 하는 느낌이라고 찾아보았습니다.

- `npm run db:migrate`: DDL 실행
- `npm run db:seed`: 기본 데이터 (카테고리, 상태 등) 등록
- `npm run db:import`: `.csv` 데이터베이스에 업롣

> 아마 UNIQUE 또는 UPSERT, ON CONFLICT 등과 같은 문법을 이용하는 것이 옳을 것 같습니다.

### 4. healthcheck
Node 서버에 `GET /health`, `GET /ready`를 받아서 `server`, `databse`, `worker` 등의 상태를 반환하기 위해 사용하게 될 것 같습니다.

### 5. 파이썬 워커 오토스케일링
파이썬 워커또한 CPU 작업인데 반해 작업이 길어질 확률 또한 존재하기 때문에 결과를 캐싱하거나 오토스케일링할 수 있는 구조를 고려해야할 수 있습니다.

*일단 현재는 단일 작업을 확인한 다음 `Worker Manager`을 고려할 수 있을 것 같습니다.*

### 6. DTO
이건 당연하게 도입해야 관리가 쉬울 것으로 보이며 팀원들이 TypeScript를 몰라도 진행할 수 있도록 어느정도 함수 등을 미리 작성해 놓고 규격 또한 만들어놓을 예정입니다.

### 7. 외부 API 및 어댑터 규격
이 또한 `infrastructure`을 이용하여
- tmap
- sms
- llm
- routeMaker 

등과 같이 제작할까 고민중입니다.

### 8. 사용할 패키지
- `express`
- `typescript`
- `TypeScript` 타입이 없는 패키지에 대해서 `-D @types/`를 추가하기 (`package.json`에 `types` 또는 `typings`가 있으면 자체 타입을 포함한 경우가 많다고 하며 없으면 에러가 나니 확인 가능합니다.)
- `zod`: 런타임 데이터 검증 및 DTO 검증
- `bcrypt`: 크립토
- `jsonwebtoken`: jwt
- `helmet`: 빠른 로깅 라이브러리 (console.log 대신 구조화된 로그를 남김)
- `pino`: Express에 보안 관련 HTTP Header을 자동으로 추가 (서버 기본 보안용)
- `pg`: postgres 통신
- `pino-http`: pino를 HTTP 요청/응답에 붙여주는 미들웨어
- 누가 어떤 API를 호출했고 얼마나 걸렸는지를 자동 로깅
- `express-rate-limit`: 특정 IP가 API를 너무 많이 호출하는걸 제한
- `vitest`: TypeScript/JavaScript 테스트 프레임워크 (Jest와 비슷하지만 Vite 생태계에서 가볍고 빠른편)
- `supertest`: Express API를 서버 포트에 열지 않고 없이 테스트 가능

> 먼저 zod(스키마 검사), `pino[-http]` (기본 보안), `helmet`(로깅)을 테스트하고 나중에 여건이 되면 `express-rate-limit`, `vitest`, `supertest`를 넣는 것으로 하겠습니다.

### 9. 노드 버전 및 npm
- Node: `24.18.0` 고정
- npm: `11.16.0` 고정

### 10. `package.json`과 `tsconfig.json`
전체적인 과정은 아무래도
1. TS가 `tsconfig.json`
2. JS가 `package.json`을 이용해서 실행

과 같은 느낌일 것 같습니다. 한번 알아보면

### 10. `package.json`
`package.json`은 플젝트 메타데이터와 실행 규칙을 정의하는 파일입니다.

이곳에는 Node 프로그램이 `.js`를 실행할 대 해당 파일이 속한 package scope의 `package.json`을 찾아 참고하여 실행합니다.

또한 `npm install`, `npm run *` 또한 해당 경로를 찾아 `scripts`를  읽게됩니다.

`package.json`에는 다음과 같은 정보가 존재합니다.
- name
- version
- main (기본 진입점)
- type: Node.js의 런타임의 해석 방식
- scripts: `test` 등과 같은 예외를 빼고는 `npm run *`을 정의
- dependencies: 실제 서버 실행해도 필요한 것
- devDependencies: 개발/빌드할 때 필요한 것 (npm ci --omit=dev로 제외 가능)

### 11. `tsconfig.json`
`tsconfig.json`은 TypeScript 코드를 어떤 규칙으로 검사하고 어떤 JS로 빌드할지를 정하는 파일입니다.

보통 TS 코드 위치, 빌드될 JS 위치, 빌드할 타입 (`module: NodeNext`, , `moduleResolution: NodeNext` 또는 `module: CommonJS`), target을 통한 JavaScipt 버전 선택, `types: ["node"]`를 통한 Node 타입 사용. `strict: true`를 통한 타입 검사 엄격하게 진행, `sourceMap: true`를 통한 에러를 `src/`와 같은 `rootDir`를 기준으로 출력하게 해줍니다.

### 12. `package.json`의 script 작성
```json
"scripts": {
  "test": "tsx-env NODE_ENV=test vitest",
  "dev": "cross-env NODE_ENV=development tsx watch src/server.ts",
  "build": "tsc",
  "start": "cross-env NODE_ENV=production node dist/server.js",
  "typecheck": "tsc --noEmit"
},
```

과 같이 작성하였으며 `npm run start`는 `docker-compose`에서 `NODE_ENV`를 넣어주지만 일단 로컬에서도 실행할 수 있기 때문에 넣어놓았습니다.

### 13. 진짜 패키지 설치
이제 위에서 말한 패키지들중 쓸것들만 설치했습니다.
```bash
npm install zod pg pino pino-http helmet express jsonwebtoken bcrypt dotenv
npm install -D typescript @types/node @types/express cross-env @types/jsonwebtoken @types/bcrypt @types/pg
```

# 중간 마무리

`2026-08-29 21:41:21`: 일단 시간이 늦어 정리하고 내일 아침에 바로 서버 구조 생성, 마이그레이션, 데이터베이스, 워커 준비를 하도록 하겠습니다.
