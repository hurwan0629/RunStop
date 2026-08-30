# 파이썬 3.12 기반 이미지 받아오기
FROM python:3.12-slim

# 컨테이너의 `app/` 에서 작업
WORKDIR /app

# 의존성 파일 빌드 컨테이너 `app/`에 복사
COPY requirements.txt ./

# 패키지 받기 (--no-cache-dir은 pip에서 캐싱 폴더를 만들지 않게 하기)
RUN pip install --no-cache-dir -r requirements.txt

# 파이썬 코드 및 필요한 내용들 모두 받기
COPY . .

# 8000포트를 사용함을 명시
EXPOSE 8000

# 이미지 실행 시 사용할 명령어
CMD ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8000"]

