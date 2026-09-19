# React + Vite

## 러닝 조회

- 사이드바 **러닝 기록** 또는 회원 상세의 **러닝 지도 보기**에서 목록으로 이동한다.
- 상세 지도는 실제 GPS(초록)를 기본으로 보여준다. `실제 주행 / 추천 코스 / 겹쳐 보기`로 전환하며, 옆의 다른 추천에서 `비교`를 누르면 한 코스씩 점선으로 추가한다. 선택 구간은 주황색으로 강조한다.
- 지도는 공식 네이버 Maps JavaScript API v3를 사용하며 네이버 기본 출처·로고를 유지한다.
- 대시보드의 기간·항목을 바꾸면 실제 DB 집계로 그래프를 갱신한다. 날짜를 클릭하면 해당 날짜의 러닝 목록으로 이동한다.
- 새 백엔드·워커와 DB 마이그레이션 적용이 필요하다. GPS가 없는 과거 러닝도 저장된 선택 코스는 표시한다.

## 네이버 지도 설정

1. `.env.example`을 `.env.local`로 복사하고 `VITE_NAVER_MAP_CLIENT_ID`에 네이버 클라우드 Maps Application의 **Client ID**를 넣는다. Client Secret은 사용하지 않는다.
2. 해당 Application의 **Web Dynamic Map**을 활성화하고 Web 서비스 URL에 `http://localhost:3000`과 배포 시 관리자 사이트 주소를 등록한다. 모바일과 같은 Client ID를 사용하더라도 웹 서비스 등록이 필요하다.
3. 개발 서버를 재시작한다. 배포에서는 빌드 시 이 환경변수를 제공하고 `npm run build`를 다시 실행한다.

설정 안내: https://guide.ncloud-docs.com/docs/maps-app

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
