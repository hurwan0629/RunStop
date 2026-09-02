# Worker 어댑터

## 역할

- Python Worker 또는 분석 서버와 통신합니다.
- 코스 추천, 페이스 분석, 경로 계산 보조 작업을 Node 서비스에서 사용할 수 있는 형태로 변환합니다.

## 설정 값

- `WORKER_URL`

## 입력 기준

- Node 내부 DTO를 Worker 요청 DTO로 변환합니다.
- 좌표, 거리, 시간 조건은 호출 전에 검증된 값만 넘깁니다.

## 출력 기준

- Worker 응답을 Node 서비스 내부 타입으로 변환합니다.
- Worker 오류는 `ApiError`로 변환할 수 있는 형태로 정리합니다.

## 주요 에러

- Worker 연결 실패
- Worker 응답 형식 오류
- Worker 처리 실패
