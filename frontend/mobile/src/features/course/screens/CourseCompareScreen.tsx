import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { selectCourse } from '../api/courseApi';
import { useCourseDraft } from '../context/CourseDraftContext';
import type { RouteRecommendation } from '../types';
import { courseFlowStyles as styles } from './CourseFlow.styles';

export default function CourseCompareScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { draft, recommendationResult } = useCourseDraft();
  const recommendations = useMemo(
    () => recommendationResult?.recommendations ?? [],
    [recommendationResult],
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    recommendations[0]?.idx ?? null,
  );
  const [isSelecting, setIsSelecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const selectedCourse = useMemo(
    () => recommendations.find((course) => course.idx === selectedId) ?? null,
    [recommendations, selectedId],
  );

  const openSelectedCourse = async () => {
    if (!accessToken || !recommendationResult || !selectedCourse) {
      setErrorMessage('선택할 수 있는 코스가 없습니다.');
      return;
    }

    setIsSelecting(true);
    setErrorMessage('');

    try {
      await selectCourse(
        accessToken,
        recommendationResult.requestIdx,
        selectedCourse.idx,
      );
      router.push({
        pathname: '/course/[courseId]',
        params: { courseId: String(selectedCourse.idx) },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSelecting(false);
    }
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
        <Text style={styles.screenTitle}>{'추천 코스 비교'}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{'4 / 4'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.compareStartPoint}>
          {`← ${draft.startPoint?.name ?? '출발지'} 기준 코스`}
        </Text>
        <Text style={styles.introTitle}>{'추천 코스를 비교해 보세요'}</Text>
        <Text style={styles.compareHelp}>
          {'추천 점수와 거리, 오르막 정보를 비교해 하나를 선택할 수 있어요.'}
        </Text>

        {recommendations.length === 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {'추천 결과가 없습니다. 조건을 바꾸고 다시 찾아주세요.'}
            </Text>
          </View>
        ) : (
          recommendations.map((course, index) => (
            <CourseCard
              active={selectedId === course.idx}
              course={course}
              key={course.idx}
              label={String.fromCharCode(65 + index)}
              onPress={() => setSelectedId(course.idx)}
            />
          ))
        )}

        {errorMessage ? (
          <Text style={[styles.noticeText, { color: '#E5484D' }]}>
            {errorMessage}
          </Text>
        ) : null}

        {selectedCourse ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSelecting}
            onPress={() => void openSelectedCourse()}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}>
            {isSelecting ? (
              <ActivityIndicator color="#C8FF30" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {`코스 ${courseLabel(recommendations, selectedCourse.idx)} 선택하기`}
              </Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CourseCard({
  active,
  course,
  label,
  onPress,
}: {
  active: boolean;
  course: RouteRecommendation;
  label: string;
  onPress: () => void;
}) {
  const distanceKm = course.totalDistance === null
    ? '--'
    : (course.totalDistance / 1000).toFixed(1);
  const estimatedMinutes = course.totalDistance === null
    ? '--'
    : String(Math.round((course.totalDistance / 1000) * 6));

  const score = course.score === null ? null : Math.max(0, Math.min(100, Math.round(course.score)));

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
        <View style={[styles.courseRadio, active && styles.courseRadioActive]}>
          {active ? <View style={styles.courseRadioDot} /> : null}
        </View>
        <View style={styles.courseCopy}>
          <View style={styles.courseNameRow}>
            <Text style={styles.courseName}>{`코스 ${label}`}</Text>
            {active ? <Text style={styles.recommendBadge}>{'추천'}</Text> : null}
          </View>
          <Text style={styles.courseSummary}>{`${distanceKm}km · 예상 ${estimatedMinutes}분`}</Text>
        </View>
        <View style={styles.scoreBlock}>
          <Text style={styles.scoreLabel}>{'조건 충족도'}</Text>
          <View style={styles.scoreLine}>
            <View style={[styles.scoreFill, { width: `${score ?? 0}%` }]} />
          </View>
          <Text style={styles.scoreText}>{score === null ? '--' : `${score}%`}</Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <Metric label="거리" value={`${distanceKm}km`} />
        <Metric label="예상 시간" value={`${estimatedMinutes}분`} />
        <Metric
          label="누적 오르막"
          value={course.totalAscent === null ? '--' : `${Math.round(course.totalAscent)}m`}
        />
        <Metric
          label="경사도 편차"
          value={course.slopeStd === null ? '--' : course.slopeStd.toFixed(1)}
        />
      </View>

      {active ? (
        <>
          <View style={styles.detailsDivider} />
          <View style={styles.reasonBox}>
            <Text style={styles.reasonTitle}>{'추천 이유'}</Text>
            <Text style={styles.reasonText}>
              {course.slopeStd === null
                ? '입력한 조건을 기준으로 경로를 비교했습니다.'
                : `입력한 목표에 맞춰 경사도 편차 ${course.slopeStd.toFixed(1)}인 경로를 우선 추천했어요.`}
            </Text>
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function courseLabel(recommendations: RouteRecommendation[], selectedId: number) {
  const index = recommendations.findIndex((course) => course.idx === selectedId);
  return String.fromCharCode(65 + Math.max(0, index));
}
