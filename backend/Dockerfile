# 사용할 이미지 가져오기
FROM node:24.18.0

# 빌드 작업을 하는 컨테이너의 작업 공간 설정
WORKDIR /app

# 개발 디렉토리에서 package*.json을 /app으로 복사
COPY package*.json ./

# 의존성 다운 (RUN 명령어는 이미지를 빌드할 때 사용)
RUN npm ci

# 캐싱에 의해 코드(패키지 x)를 바꿀 시 해당부분부터 다시 시작
# `backend/`의 모든 요소를 컨테이너의 `app/`로 옮기기 (typescript 등 모두 복사)
COPY . .

# `app/src/`의 TypeScript 프로젝트를 `app/dist/`로 빌드해주기
RUN npm run build 

# 해당 컨테이너의 3000번 포트를 사용하는 것을 명시해주기
EXPOSE 3000

# 컨테이너를 실행할 때 사용할 명령어
CMD ["npm", "start"]