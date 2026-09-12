import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  type ImageSourcePropType,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { AnimatedCourseTrack } from '../components/AnimatedCourseTrack';

import { getRouteBookmarks } from '@/features/bookmarks/api/bookmarksApi';
import type { CourseBookmark } from '@/features/bookmarks/types';
import { getMyPageSummary } from '@/features/profile/api/profileApi';
import type { MyPageSummary } from '@/features/profile/types';
import { getRunningHistoryForPeriod } from '@/features/records/api/recordsApi';
import type { RunningHistoryItem } from '@/features/records/types';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { styles } from './HomeScreen.styles';

const homeSectionIcons = {
  goal: require('@/assets/images/homeSectionIcons/target.png'),
  recentRunning: require('@/assets/images/homeSectionIcons/running.png'),
  bookmarks: require('@/assets/images/homeSectionIcons/star.png'),
};

export default function HomeScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<MyPageSummary | null>(null);
  const [records, setRecords] = useState<RunningHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<CourseBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [trackReplayKey, setTrackReplayKey] = useState(0);

  const loadHome = useCallback(async () => {
    if (!accessToken) {
      setSummary(null);
      setRecords([]);
      setBookmarks([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [nextSummary, nextRecords, nextBookmarks] = await Promise.all([
        getMyPageSummary(accessToken),
        getRunningHistoryForPeriod(accessToken, {
          from: getHistoryStart(),
          to: toDateString(new Date()),
        }),
        getRouteBookmarks(accessToken),
      ]);

      setSummary(nextSummary);
      setRecords(nextRecords);
      setBookmarks(nextBookmarks.items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      // 탭을 다시 선택하거나 다른 화면에서 홈으로 돌아올 때 트랙을 새로 마운트합니다.
      setTrackReplayKey((currentKey) => currentKey + 1);
      void loadHome();
    }, [loadHome]),
  );

  const distances = useMemo(() => calculateDistances(records), [records]);
  const latestRecord = records[0] ?? null;
  const firstBookmark = bookmarks[0] ?? null;
  const goalRate = summary?.currentGoal
    ? Math.min(
      100,
      Math.round(
        (summary.currentGoal.progressDistance /
          summary.currentGoal.targetDistance) *
        100,
      ),
    )
    : 0;

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
          <Text style={styles.heroEyebrow}>오늘의 코스 만들기</Text>

          <View style={styles.courseIllustration}>
            <AnimatedCourseTrack key={trackReplayKey} />
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroMessage}>
              <LocationPinIcon />
              <Text style={styles.heroDescription}>
                {'원하는 조건으로\n바로 시작해보세요!'}
              </Text>
            </View>

            <Pressable
              style={styles.courseButton}
              onPress={() => router.push('/course')}
            >
              <Text style={styles.courseButtonText}>코스 찾기</Text>
              <View style={styles.courseButtonArrow}>
                <View style={styles.arrowShaft} />
                <View style={[styles.arrowHead, styles.arrowHeadTop]} />
                <View style={[styles.arrowHead, styles.arrowHeadBottom]} />
              </View>
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#100078" style={{ marginTop: 18 }} />
        ) : null}
        {errorMessage ? (
          <Pressable onPress={() => void loadHome()} style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Text style={styles.retryText}>{'다시 불러오기'}</Text>
          </Pressable>
        ) : null}

        <View style={styles.summaryRow}>
          <DistanceCard label="오늘" meters={distances.today} />
          <DistanceCard label="이번 주" meters={distances.week} />
          <DistanceCard label="이번 달" meters={distances.month} />
        </View>

        <SectionHeader
          icon={homeSectionIcons.goal}
          onPress={() => router.push('/profile/goals')}
          title="러닝 목표"
        />
        {summary?.currentGoal ? (
          <View style={styles.dataCard}>
            <Text style={styles.dataTitle}>
              {summary.currentGoal.goalType === 'WEEKLY'
                ? '주간 러닝 목표'
                : '월간 러닝 목표'}
            </Text>
            <Text style={styles.dataMeta}>
              {`${metersToKm(summary.currentGoal.progressDistance)} / ${metersToKm(summary.currentGoal.targetDistance)}km · ${goalRate}%`}
            </Text>
            <View style={styles.goalTrack}>
              <View style={[styles.goalFill, { width: `${goalRate}%` }]} />
            </View>
          </View>
        ) : (
          <EmptyCard
            actionLabel="목표 설정"
            description="첫 목표를 정하고 러닝을 시작해보세요."
            onPress={() => router.push('/profile/goals')}
            title="아직 설정한 러닝 목표가 없어요"
          />
        )}

        <SectionHeader
          icon={homeSectionIcons.recentRunning}
          onPress={() => router.push('/records')}
          title="최근 러닝"
        />
        {latestRecord ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/records/[sessionId]',
                params: {
                  averagePace: String(latestRecord.averagePace ?? ''),
                  distance: String(latestRecord.distance ?? ''),
                  finishedAt: latestRecord.finishedAt ?? '',
                  sessionId: String(latestRecord.idx),
                  startedAt: latestRecord.startedAt,
                },
              })
            }
            style={styles.dataCard}>
            <Text style={styles.dataTitle}>{`러닝 기록 #${latestRecord.idx}`}</Text>
            <Text style={styles.dataMeta}>
              {`${formatDate(latestRecord.startedAt)} · ${metersToKm(latestRecord.distance ?? 0)}km · ${formatPace(latestRecord.averagePace)}`}
            </Text>
          </Pressable>
        ) : (
          <EmptyCard
            actionLabel="첫 러닝 준비"
            description="러닝을 완료하면 최근 기록이 여기에 보여요."
            onPress={() => router.push('/course/setup')}
            title="아직 러닝 기록이 없어요"
          />
        )}

        <SectionHeader
          icon={homeSectionIcons.bookmarks}
          onPress={() => router.push('/profile/bookmarks')}
          title="즐겨찾기 코스"
        />
        {firstBookmark ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/course/[courseId]',
                params: {
                  courseId: String(firstBookmark.routeRecommendationIdx),
                },
              })
            }
            style={styles.dataCard}>
            <Text style={styles.dataTitle}>{firstBookmark.name}</Text>
            <Text style={styles.dataMeta}>
              {firstBookmark.totalDistance === null
                ? '거리 정보 없음'
                : `${metersToKm(firstBookmark.totalDistance)}km · 오르막 ${Math.round(firstBookmark.totalAscent ?? 0)}m`}
            </Text>
          </Pressable>
        ) : (
          <EmptyCard
            actionLabel="코스 만들기"
            description="마음에 드는 코스를 저장하면 여기에 모아볼 수 있어요."
            onPress={() => router.push('/course')}
            title="즐겨찾기한 코스가 없어요"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LocationPinIcon() {
  return (
    <Svg
      accessibilityElementsHidden
      accessible={false}
      height={29}
      viewBox="0 0 24 24"
      width={29}
    >
      <Path
        d="M12 21s7-6.22 7-12A7 7 0 1 0 5 9c0 5.78 7 12 7 12Z"
        fill="none"
        stroke="#100078"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
      <Circle cx={12} cy={9} fill="#100078" r={2.2} />
    </Svg>
  );
}

function DistanceCard({ label, meters }: { label: string; meters: number }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{`${metersToKm(meters)} km`}</Text>
    </View>
  );
}

function SectionHeader({
  icon,
  title,
  onPress,
}: {
  icon: ImageSourcePropType;
  title: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleGroup}>
        <Image
          source={icon}
          style={[styles.sectionIcon, { tintColor: '#04045E' }]}
        />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
        <Text style={styles.moreText}>더보기</Text>
      </Pressable>
    </View>
  );
}
function EmptyCard({
  title,
  description,
  actionLabel,
  onPress,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
}) {
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

function calculateDistances(records: RunningHistoryItem[]) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return records.reduce(
    (result, record) => {
      const startedAt = new Date(record.startedAt);
      const distance = record.distance ?? 0;

      if (startedAt >= todayStart) {
        result.today += distance;
      }
      if (startedAt >= weekStart) {
        result.week += distance;
      }
      if (startedAt >= monthStart) {
        result.month += distance;
      }

      return result;
    },
    { today: 0, week: 0, month: 0 },
  );
}

function getHistoryStart() {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);

  return toDateString(date);
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function metersToKm(value: number) {
  return Number((value / 1000).toFixed(1));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
  });
}

function formatPace(value: number | null) {
  if (value === null || value <= 0) {
    return '페이스 --';
  }

  const minutes = Math.floor(value / 60);
  const seconds = String(Math.round(value % 60)).padStart(2, '0');

  return `${minutes}'${seconds}"/km`;
}
