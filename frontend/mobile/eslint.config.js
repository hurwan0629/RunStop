// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores(["dist/**", ".expo/**"]),
  expoConfig,
  {
    rules: {
      // 비동기 API 로딩을 시작하는 일반적인 React Native 화면 패턴을 허용합니다.
      "react-hooks/set-state-in-effect": "off",
    },
  }
]);
