/** TODO: 환경별 API 기본 주소 등 앱 설정을 정의합니다. */
export const config = {
    apiBaseUrl:
        process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:3000',
} as const;
