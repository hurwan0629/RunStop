import { Tabs } from 'expo-router';

/** 로그인 후 사용하는 하단 탭 내비게이션입니다. */
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" options={{ title: '홈' }} />
      <Tabs.Screen name="course" options={{ title: '코스' }} />
      <Tabs.Screen name="records" options={{ title: '기록' }} />
      <Tabs.Screen name="my-page" options={{ title: '마이페이지' }} />
    </Tabs>
  );
}
