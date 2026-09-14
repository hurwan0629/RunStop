import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCourseDraft } from '../context/CourseDraftContext';
import type {
  FacilityPreferenceMode,
  RouteRecommendation,
} from '../types';
import { courseFlowStyles as styles } from './CourseFlow.styles';

export default function CourseCompareScreen() {
  const router = useRouter();
  const { draft, recommendationResult } = useCourseDraft();
  const recommendations = useMemo(
    () => recommendationResult?.recommendations ?? [],
    [recommendationResult],
  );
  const facilityPreferences: Record<
    'toilet' | 'store',
    FacilityPreferenceMode
  > = {
    toilet: draft.facilities.includes('TOILET') ? 'PREFER' : 'IGNORE',
    store: draft.facilities.includes('CONVENIENCE_STORE')
      ? 'PREFER'
      : 'IGNORE',
  };
  const [selectedId, setSelectedId] = useState<number | null>(
    recommendations[0]?.idx ?? null,
  );
  const [errorMessage, setErrorMessage] = useState('');
  const selectedCourse = useMemo(
    () => recommendations.find((course) => course.idx === selectedId) ?? null,
    [recommendations, selectedId],
  );

  const openSelectedCourse = () => {
    if (!recommendationResult || !selectedCourse) {
      setErrorMessage('선택할 수 있는 코스가 없습니다.');
      return;
    }

    setErrorMessage('');

    router.push({
      pathname: '/course/[courseId]',
      params: {
        courseId: String(selectedCourse.idx),
        requestId: String(recommendationResult.requestIdx),
      },
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
              facilityPreferences={facilityPreferences}
              key={course.idx}
              label={String.fromCharCode(65 + index)}
              onPress={() => setSelectedId(course.idx)}
              targetDistanceKm={draft.targetDistanceKm}
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
            onPress={openSelectedCourse}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.primaryButtonText}>
              {'선택한 코스 상세 보기'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
function buildRecommendationReasons(
  course: RouteRecommendation,
  {
    targetDistanceKm,
    facilityPreferences,
  }: {
    targetDistanceKm: number;
    facilityPreferences: Record<'toilet' | 'store', FacilityPreferenceMode>;
  },
) {
  const reasons: string[] = [];

  const appendFacilityReason = (
    facilityName: string,
    preference: FacilityPreferenceMode,
    facility?: { count: number; status: 'MET' | 'RELAXED' | 'IGNORE' },
  ) => {
    if (preference !== 'PREFER' || !facility) {
      return;
    }

    if (facility.status === 'MET') {
      reasons.push(`${facilityName} ${facility.count}개가 있는 경로예요.`);
      return;
    }

    if (facility.status === 'RELAXED') {
      reasons.push(
        `${facilityName} 조건을 충족하는 후보가 부족해 대안 코스로 함께 제안했어요.`,
      );
    }
  };

  appendFacilityReason(
    '화장실',
    facilityPreferences.toilet,
    course.facilities?.toilet,
  );
  appendFacilityReason(
    '편의점',
    facilityPreferences.store,
    course.facilities?.store,
  );

  if (course.totalDistance !== null && targetDistanceKm > 0) {
    const actualDistanceKm = course.totalDistance / 1000;
    const differenceKm = Math.abs(actualDistanceKm - targetDistanceKm);

    reasons.push(
      `목표 거리 ${targetDistanceKm}km와 ${differenceKm.toFixed(1)}km 차이예요.`,
    );
  }

  const maxSlope = course.slope?.maxSlopePct;
  if (typeof maxSlope === 'number' && course.totalAscent !== null) {
    reasons.push(
      `최대 경사 ${maxSlope.toFixed(1)}%, 누적 오르막 ${Math.round(course.totalAscent)}m예요.`,
    );
  }

  return reasons.length > 0
    ? reasons
    : ['입력한 거리와 조건을 기준으로 비교한 코스예요.'];
}

function CourseCard({
  active,
  course,
  facilityPreferences,
  label,
  onPress,
  targetDistanceKm,
}: {
  active: boolean;
  course: RouteRecommendation;
  facilityPreferences: Record<'toilet' | 'store', FacilityPreferenceMode>;
  label: string;
  onPress: () => void;
  targetDistanceKm: number;
}) {
  const distanceKm = course.totalDistance === null
    ? '--'
    : (course.totalDistance / 1000).toFixed(1);
  const estimatedMinutes = course.totalDistance === null
    ? '--'
    : String(Math.round((course.totalDistance / 1000) * 6));

  const score = course.score === null ? null : Math.max(0, Math.min(100, Math.round(course.score)));
  const reasons = buildRecommendationReasons(course, {
    targetDistanceKm,
    facilityPreferences,
  });

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
            <Text style={styles.courseName}>{course.name || `코스 ${label}`}</Text>
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
            {reasons.map((reason, index) => (
              <Text
                key={`${index}-${reason}`}
                style={styles.reasonText}>
                {`• ${reason}`}
              </Text>
            ))}
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
