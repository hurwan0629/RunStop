import { Redirect } from 'expo-router';

/**
 * 앱 진입 경로입니다.
 * 로그인 상태 확인 로직을 붙이기 전까지 로그인 화면으로 이동합니다.
 */
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/providers/AuthProvider';

export default function Index() {
  const { accessToken, isInitializing } = useAuth();

  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Redirect href={accessToken ? '/home' : '/login'} />
  );
}
