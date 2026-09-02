# 어댑터 설계

외부 시스템 연동 모듈의 역할과 교체 기준을 관리합니다.

## 문서 목록

- [Worker 어댑터](./01_Worker_어댑터.md)
- [LLM 어댑터](./02_LLM_어댑터.md)
- [SMS 어댑터](./03_SMS_어댑터.md)
- [TMap 어댑터](./04_TMap_어댑터.md)

## 공통 기준

- Service는 외부 API 세부 구현에 직접 의존하지 않습니다.
- Adapter는 외부 API 요청/응답을 서버 내부 타입으로 변환합니다.
- 외부 API 사용 여부나 URL은 `env`에서 관리합니다.
- 개발 환경에서는 console, mock, local worker 같은 대체 구현을 사용할 수 있어야 합니다.
