import { Stack } from 'expo-router';

/**
 * 앱 전체의 최상위 내비게이션을 설정합니다.
 * 인증 상태 Provider와 전역 설정은 이후 이 파일에 연결합니다.
 */

import { AuthProvider } from '@/providers/AuthProvider';
import { CourseDraftProvider } from '@/features/course/context/CourseDraftContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CourseDraftProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </CourseDraftProvider>
    </AuthProvider>
  );
}
