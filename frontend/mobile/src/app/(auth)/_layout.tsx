import { Stack } from 'expo-router';

/** 인증 관련 화면의 공통 내비게이션 설정입니다. */
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
