import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { styles } from './HomeScreen.styles';

const distanceSummaries = [
  { label: '오늘', distance: '0 km' },
  { label: '이번 주', distance: '0 km' },
  { label: '이번 달', distance: '0 km' },
] as const;

/**
 * 로그인 후 가장 먼저 보여주는 홈 화면입니다.
 * 현재는 백엔드 연동 전이므로 실제 첫 사용자의 상태인 0km와 빈 목록을 표시합니다.
 */
export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoLetter}>R</Text>
          </View>
          <Text style={styles.brandName}>RunStop</Text>
        </View>

        <Text style={styles.heading}>{'오늘도 달려볼까요?'}</Text>
        <Text style={styles.subheading}>
          {'오늘의 러닝 코스를 찾아드릴게요'}
        </Text>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>{'오늘의 코스 만들기'}</Text>
            <Text style={styles.heroTitle}>
              {'원하는 조건으로\n바로 시작해보세요!'}
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/course')}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}>
              <Text style={styles.primaryButtonText}>{'코스 찾기'}</Text>
            </Pressable>
          </View>

          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.courseIllustration}>
            <View style={styles.routeLineOne} />
            <View style={styles.routeLineTwo} />
            <View style={styles.routeStart} />
            <View style={styles.routeFinish} />
          </View>
        </View>

        <View style={styles.summaryRow}>
          {distanceSummaries.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.distance}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.summaryHelp}>
          {'러닝 기록이 쌓이면 거리가 자동으로 표시돼요.'}
        </Text>

        <SectionHeader
          onPress={() => router.push('/profile/goals')}
          title="러닝 목표"
        />
        <EmptyCard
          actionLabel="목표 설정"
          description="첫 목표를 정하고 러닝을 시작해보세요."
          onPress={() => router.push('/profile/goals')}
          title="아직 설정한 러닝 목표가 없어요"
        />

        <SectionHeader
          onPress={() => router.push('/records')}
          title="최근 러닝"
        />
        <EmptyCard
          actionLabel="첫 러닝 준비"
          description="러닝을 완료하면 최근 기록이 여기에 보여요."
          onPress={() => router.push('/course/setup')}
          title="아직 러닝 기록이 없어요"
        />

        <SectionHeader
          onPress={() => router.push('/profile/bookmarks')}
          title="즐겨찾기 코스"
        />
        <EmptyCard
          actionLabel="코스 둘러보기"
          description="마음에 드는 코스를 저장하면 여기에 모아볼 수 있어요."
          onPress={() => router.push('/course')}
          title="즐겨찾기한 코스가 없어요"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type SectionHeaderProps = {
  title: string;
  onPress: () => void;
};

function SectionHeader({ title, onPress }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
        <Text style={styles.moreText}>{'더보기'}</Text>
      </Pressable>
    </View>
  );
}

type EmptyCardProps = {
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
};

function EmptyCard({
  title,
  description,
  actionLabel,
  onPress,
}: EmptyCardProps) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDescription}>{description}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed && styles.buttonPressed,
        ]}>
        <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
