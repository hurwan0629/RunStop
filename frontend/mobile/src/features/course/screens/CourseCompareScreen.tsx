import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mockCourseRecommendations } from '../mocks/mockRecommendations';
import type { CourseRecommendationPreview } from '../types';
import { courseFlowStyles as styles } from './CourseFlow.styles';

/** 추천된 세 코스를 비교하고 하나를 선택하는 4단계 화면입니다. */
export default function CourseCompareScreen() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(
    mockCourseRecommendations[0].id,
  );
  const selectedCourse = useMemo(
    () =>
      mockCourseRecommendations.find((course) => course.id === selectedId) ??
      mockCourseRecommendations[0],
    [selectedId],
  );

  const openSelectedCourse = () => {
    router.push({
      pathname: '/course/[courseId]',
      params: { courseId: selectedCourse.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로 가기"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}>
          <Text style={styles.backButton}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{'코스 비교'}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{'4 / 4'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.introTitle}>{'추천 코스를 비교해 보세요'}</Text>
        <Text style={styles.compareHelp}>
          {
            '카드를 누르면 상세 조건이 열립니다. 현재는 화면 확인용 추천 결과예요.'
          }
        </Text>

        {mockCourseRecommendations.map((course) => (
          <CourseCard
            active={selectedId === course.id}
            course={course}
            key={course.id}
            onPress={() => setSelectedId(course.id)}
          />
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={openSelectedCourse}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.primaryButtonText}>
            {`${selectedCourse.label} 코스 선택하기`}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseCard({
  active,
  course,
  onPress,
}: {
  active: boolean;
  course: CourseRecommendationPreview;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.courseCard,
        active && styles.courseCardActive,
        pressed && styles.pressed,
      ]}>
      <View style={styles.courseHeader}>
        <View style={styles.courseLabel}>
          <Text style={styles.courseLabelText}>{course.label}</Text>
        </View>
        <View style={styles.courseCopy}>
          <Text style={styles.courseName}>{course.name}</Text>
          <Text style={styles.courseSummary}>{course.summary}</Text>
        </View>
        <Text style={styles.scoreText}>{`${course.score}점`}</Text>
      </View>

      <View style={styles.metricRow}>
        <Metric label="거리" value={`${course.distanceKm}km`} />
        <Metric label="예상 시간" value={`${course.estimatedMinutes}분`} />
        <Metric label="평균 페이스" value={`${course.averagePace}/km`} />
      </View>

      {active ? (
        <>
          <View style={styles.detailsDivider} />
          <View style={styles.detailGrid}>
            <Detail label="누적 오르막" value={`${course.totalAscentM}m`} />
            <Detail label="경사도" value={course.slopeLabel} />
            <Detail label="화장실" value={`${course.toiletCount}곳`} />
            <Detail
              label="편의점"
              value={`${course.convenienceStoreCount}곳`}
            />
            <Detail label="야간 인프라" value={course.nightInfraLabel} />
          </View>
          <Text style={styles.reasonTitle}>{'이 코스를 추천한 이유'}</Text>
          {course.reasons.map((reason) => (
            <Text key={reason} style={styles.reasonText}>{`• ${reason}`}</Text>
          ))}
          <Text style={styles.selectedHint}>{'선택된 코스'}</Text>
        </>
      ) : null}
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}
