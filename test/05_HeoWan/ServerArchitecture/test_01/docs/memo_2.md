# 서버 구조 및 DB, 워커, 인터페이스 준비
> `2026-08-30 10:44:26`: 어제까지 사전 공부를 하였던 `TypeScript`, `Python Worker` & `프로세스/FD/파이프 개념`, `PostGIS` 등을 이용하여 이제 프로젝트 구조를 대강 잡아보기 시작하려 합니다.

## 1. 현재 상태 복기

우선 어제 문맥을 기억해내기 위해 `npm list`를 찍어보았습니다.

```bash
PS C:\LANG_CHAIN_2026\MidProject\test\05_HeoWan\ServerArchitecture\test_01> npm list                                                
runstop-server-design@1.0.0 C:\LANG_CHAIN_2026\MidProject\test\05_HeoWan\ServerArchitecture\test_01                                 
├── @types/bcrypt@6.0.0                                           
├── @types/express@5.0.6                                          
├── @types/jsonwebtoken@9.0.10                                    
├── @types/node@26.4.0                                            
├── @types/pg@8.23.1                                              
├── bcrypt@6.0.0                                                  
├── cross-env@10.1.0                                              
├── dotenv@17.4.2                                                 
├── express@5.2.1                                                 
├── helmet@8.3.0                                                  
├── jsonwebtoken@9.0.3
├── pg@8.23.0
├── pino-http@11.0.0
├── pino@10.3.1
├── tsx@4.23.12
├── typescript@7.0.2
└── zod@4.5.2
```
일단 깔려져 있는 것은 기억이 났습니다.

일단 환경변수를 먼저 만들고, docker및 서버를 한번 실행시킨 뒤 돌아가는 형태를 기준으로 늘려나가는 것이 합리적이라 (이전에 맞아본 기억을 바탕으로)판단하여 일단 `.env*`, `Dockerfile`, `docker-compose`, `db-init`, `import`, `seed`, `migration` 등을 먼저 만들 생각입니다.

또한 `.env*` 파일의 경우에는 `docker-compose.yml`에서도 사용해야 하기 때문에 프로젝트 루트 레벨에 `docker-compose.yml`을 같이 두는 형태로 사용하였습니다.

![alt text](./assets/image.png)

`.env.example`은 실제로 `.env`에 쓰이진 않고, 다른 `NODE_ENV`를 가지는 환경의 템플릿 정도로 사용하였으며 이후 `Dockerfile`을 이용하여 `Node`, `Python Worker`, `React Native`를 빌드하기 위해 사용할 예정입니다.

## 2. Docker 환경 준비

###  docker compose 문법 간단히
참고로 `docker-compose`의 환경 변수는 표기 및 사용법이 살짝 햇갈리기 때문에 미리 정리하고 가면
- `${VAR}`: Docker Compose가 `docker compose up` 하기 전에 해석하여 치환됩니다.
- `$${VAR}`: Compose가 `$` 하나를 이스케이프 하며 이후 컨테이너 `shell`에서 사용합니다. (컨테이너 내부 환경변수 참조)
- `${{SECRETS.?}}`: GitHub Actions에서 CI workflow 실행중 사용
- `environment`: Docker Compose에서 컨테이너 실행 환경변수를 주입해줍니다.
- `env_file`: Docker Compose에서 파일의 env를 컨테이너에 주입해줍니다.

예를 들어 다음과 같은 스크립트를 보면
```yml
service:
  api:
    image: my-api:${IMAGE_TAG}
    environment:
      NOD_ENV: ${NODE_ENV}
      DB_HOST: ${DB_HOST}
    command: sh -c 'echo $${NODE_ENV}'
```

와 같이 사용될 수 있습니다. `${}`는 이미 넣어져서 실행되며 `$${NODE_ENV}`는 사실상 `sh -c 'echo $development'` 등과 같이 표현되었다 할 수 있습니다.

특수하게 `${{}}`를 통해 GitHub Actions에 쓸 수 있지만 일단 현재 상황과 관계 없으니 넘어가겠습니다.

`environment`는 컨테이너를 생성할 때 그 컨테이너의 환경변수로 미리 넣어놓을 키값들을 의미합니다.

또한 `리스트`, `[]`, `key-value` 형식으로 사용할 수 있으며

**`-` 리스트 방식 - block sequence**

```yml
services:
  api:
    environment:
      - NODE_ENV=production
      - PORT=3000
```

**`[]` 리스트 방식 - flow sequence**

```yml
services:
  api:
    environment: [NODE_ENV=production, PORT=3000]
```

**`key-value` 방식 - mapping**

```yml
services:
  api:
    environment:
      NODE_ENV: production
      PORT: 3000
```

> 위와같은 방식 3가지를 모두 지원하는 방식이 있으며 특정 요소만 지원하는 방식이 있으니 현재는 이런 방식의 나열법이 있는 것만 이해하는 것이 좋습니다.

### docker compose 대상 설정
React Native 의 경우에는 설치형이기 때문에 따로 `docker-compose`가 필요 없다고 생각이 들어서 그냥 `Node`, `Python Worker`, `Database`만 `compose`에 올리기로 하였습니다.

일단 프로젝트 구조를 확인하면 
```MidProject/
├─ frontend/                 # React Native
│
├─ backend/                  # Node.js Server
│  ├─ Dockerfile
│  ├─ src/
│  └─ package.json
│
├─ routing-worker/           # Python Worker
│  ├─ Dockerfile
│  ├─ src/
│  │  ├─ worker.py
│  │  ├─ algorithm/          # 경로 후보 생성
│  │  ├─ features/           # 경사/시설 등 계산
│  │  └─ ranking/            # AI 후보 선택
│  ├─ models/
│  └─ requirements.txt
│
├─ data/                     # CSV / SHP 등 원본 데이터
│
├─ infra/
│  └─ db/
│     ├─ migrations/
│     ├─ seeds/
│     └─ imports/
│
├─ docker-compose.yml
└─ README.md
```

[dir1](./assets/2026-08-30_dir.png)

### docker-compose 먼저 작성해보기
`2026-08-30 12:40:01`
> 우선 계속 고민만 하고있으면 진행이 안되니 먼저 `docker-compose`를 작성해보겠습니다.

```yml
# MidProject/docker-compose.yml
  # # # # # # # # # # # # # # # # # # # # # # # # # # # # 
 #     다음과 같은 구조를 가지고 있다는 가정 하에 동작합니다.    # 
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
#  MidProject/                                            #
#  ├─ .env.development                                    #
#  ├─ .env.test                                           #
#  ├─ .env.production                                     #
#  ├─ docker-compose.yml                                  #
#  │                                                      #
#  ├─ backend/                                            #  
#  │  └─ Dockerfile                                       #  
#  │                                                      #      
#  └─ routing-worker/                                     #    
#     └─ Dockerfile                                       #    
# # # # # # # # # # # # # # # # # # # # # # # # # # # # # #
services:
  backend: # Node 서버
    build: # `./backend/Dockerfile` 을 빌드합니다.
      context: ./backend 
    env_file:
      - .env.development
    ports:
      - "3000:3000"
    depends_on: # DB와 워커 FastAPI가 먼저 시작 후 실행 (healthcheck를 이용해서 서버 정상동작까지 가능)
      - database
      - routing-worker
  
  routing-worker:
    build: # `/routing-worker/Dockerfile` 을 빌드합니다.
      context: ./routing-worker
    env_file: # 메인 폴더의 환경을 그대로 사용합니다.
      - .env.development
    
    # ports는 워커 테스트 시에만 사용
    # ports: # FastAPI의 기본 포트인 8000번을 호스트의 포트와 연결시킵니다.
      # - "8000:8000"
    
  database:
    # PostGIS Extention이 붙어있는 17-3.5 버전을 거져옵니다.
    image: postgis/postgis:17-3.5
    env_file: # 동일한 파일에서 환경변수를 관리해줍니다.
      - .env.development
    ports:
      - "5432:5432"
    volumes: # 컨테이너 데비안의 /var/lib/postgrersql/data에 있는 데이터를 볼륨으로 영속화합니다.
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

```yml
# MidProject/.env.example

# # # # # # # # # # # # # # # # # # # # #
#        Node Server [API Server]       #
# # # # # # # # # # # # # # # # # # # # #

# 실행 환경
#   - 개발: development
#   - 테스트: test
#   - 배포: production
NODE_ENV=development
# Node 서버 포트
PORT=3000

# JWT 시크릿
JWT_SECRET=


     
# # # # # # # # # # # # # # # # # # # # #
#        Python Worker [FastAPI]        #
# # # # # # # # # # # # # # # # # # # # #

# Docker Compose 내부에서 localhost 대신 service 이름을 hostname로 설정
# > compose 내부에 있는 docker-network를 사용
WORKER_URL=http://routing-worker:8000

# 로컬용 WORKER_URL
# WORKER_URL=http://localhost:8000




# # # # # # # # # # # # # # # # # # # # #
#               데이터베이스              #
# # # # # # # # # # # # # # # # # # # # #

# Docker Compose 내부에서 서버/워커 -> database:5432 로 통신
DATABASE_URL=postgresql://postgres:1234@database:5432/runstop

# 로컬용 WORKER_URL
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/runstop

POSTGRES_DB=runstop
POSTGRES_USER=postgres
POSTGRES_PASSWORD=1234
```

### Dockerfile 작성
`2026-08-30 13:06:24`

> 이제 `backend/`와 `route-worker/`을 빌드하기 위한 `Dockerfile`을 작성하겠습니다.

