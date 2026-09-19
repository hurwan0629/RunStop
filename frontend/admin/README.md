# React + Vite

## 러닝 조회

- 사이드바 **러닝 기록** 또는 회원 상세의 **러닝 지도 보기**에서 목록으로 이동한다.
- 상세 지도는 선택 코스(남색), 실제 GPS(초록), 선택 구간(주황)을 표시한다. 옆의 미선택 코스 체크박스로 같은 요청의 다른 추천을 점선으로 비교한다.
- 지도는 Leaflet과 OpenStreetMap 타일을 사용하며 출처 표기를 유지한다. 타일을 불러오려면 브라우저에서 `tile.openstreetmap.org`에 접근할 수 있어야 한다.
- 대시보드의 기간·항목을 바꾸면 실제 DB 집계로 그래프를 갱신한다. 날짜를 클릭하면 해당 날짜의 러닝 목록으로 이동한다.
- 새 백엔드·워커와 DB 마이그레이션 적용이 필요하다. GPS가 없는 과거 러닝도 저장된 선택 코스는 표시한다.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
