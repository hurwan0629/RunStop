
/** 로그인 후 사용하는 하단 탭 내비게이션입니다. */
import { Tabs } from 'expo-router';
import { Image, StyleSheet } from 'react-native';

import { useCourseDraft } from '@/features/course/context/CourseDraftContext';
import { colors } from '@/styles/tokens';

const tabIcons = {
  home: require('@/assets/images/tabIcons/home-page.png'),
  course: require('@/assets/images/tabIcons/route.png'),
  records: require('@/assets/images/tabIcons/bar-chart.png'),
  myPage: require('@/assets/images/tabIcons/profile.png'),
};

export default function TabsLayout() {
  const { resetDraft } = useCourseDraft();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: '#A7ADBA',
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => (
            <Image
              source={tabIcons.home}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="course"
        listeners={{
          tabPress: () => {
            resetDraft();
          },
        }}
        options={{
          title: '코스',
          tabBarIcon: ({ color }) => (
            <Image
              source={tabIcons.course}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="records"
        options={{
          title: '기록',
          tabBarIcon: ({ color }) => (
            <Image
              source={tabIcons.records}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my-page"
        options={{
          title: '마이페이지',
          tabBarIcon: ({ color }) => (
            <Image
              source={tabIcons.myPage}
              style={[styles.tabIcon, { tintColor: color }]}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    height: 70,
    paddingTop: 6,
  },
  tabIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});