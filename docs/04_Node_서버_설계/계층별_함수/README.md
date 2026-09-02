# 계층별 함수 문서

이 폴더는 Node 서버의 함수 단위 책임을 계층별로 정리합니다.

## 문서 목록

- [Controller 함수](./01_Controller_함수.md)
- [Service 함수](./02_Service_함수.md)
- [Repository 함수](./03_Repository_함수.md)
- [Middleware 함수](./04_Middleware_함수.md)
- [Adapter 함수](./05_Adapter_함수.md)
- [Infra 함수](./06_Infra_함수.md)
- [DTO 스키마](./07_DTO_스키마.md)

## 작성 기준

- 함수 이름은 실제 코드의 export 이름을 기준으로 적습니다.
- 시그니처는 현재 TypeScript 코드 기준으로 적습니다.
- 인자는 요청 DTO, 내부 DTO, DB 입력 타입으로 구분합니다.
- 반환값은 Controller 응답 또는 Service/Repository 반환 타입을 적습니다.
- 미구현 함수는 `미구현`으로 표시하고 예정 역할만 적습니다.
