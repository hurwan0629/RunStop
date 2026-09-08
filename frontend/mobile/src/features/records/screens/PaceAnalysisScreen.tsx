import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyPageSummary } from '@/features/profile/api/profileApi';
import type { MyPageSummary } from '@/features/profile/types';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { getRunningHistoryForPeriod } from '../api/recordsApi';
import type { RunningHistoryItem } from '../types';
import { styles } from './PaceAnalysisScreen.styles';

type MonthPace = {
  key: string;
  label: string;
  pace: number | null;
};

const distanceSections = [3, 5, 7, 10] as const;
const runnerLevels = [
  'Lv.1 러닝 시작',
  'Lv.2 정규팬 러너',
  'Lv.3 꾸준한 러너',
  'Lv.4 달리기 선수',
  'Lv.5 RunStop Runner',
] as const;

/** 최근 러닝 기록으로 최고, 월별, 거리별 페이스를 분석합니다. */
export default function PaceAnalysisScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<MyPageSummary | null>(null);
  const [sessions, setSessions] = useState<RunningHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadAnalysis = useCallback(async () => {
    if (!accessToken) {
      setSummary(null);
      setSessions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const period = getRecentSixMonthPeriod();
      const [nextSummary, nextSessions] = await Promise.all([
        getMyPageSummary(accessToken),
        getRunningHistoryForPeriod(accessToken, period),
      ]);

      setSummary(nextSummary);
      setSessions(nextSessions);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAnalysis();
  }, [loadAnalysis]);

  const monthlyPaces = calculateMonthlyPaces(sessions);
  const comparisonText = getMonthlyComparison(monthlyPaces);
  const distancePaces = calculateDistancePaces(sessions);
  const bestPace = summary?.runningSummary.bestPace ?? null;

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
        <Text style={styles.screenTitle}>{'페이스 분석'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {!accessToken ? (
          <MessageCard message="로그인 후 페이스 분석을 확인할 수 있어요." />
        ) : null}

        {isLoading ? (
          <ActivityIndicator color="#100078" style={styles.loader} />
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadAnalysis()}>
              <Text style={styles.retryText}>{'다시 불러오기'}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && accessToken && !errorMessage ? (
          <>
            <View style={styles.bestCard}>
              <Text style={styles.bestLabel}>{'최고 평균 페이스'}</Text>
              <View style={styles.bestValueRow}>
                <Text style={styles.bestValue}>{formatPace(bestPace)}</Text>
                <Text style={styles.paceUnit}>{'/km'}</Text>
              </View>
              <Text style={styles.comparisonText}>{comparisonText}</Text>
            </View>

            <SectionHeader subtitle="최근 6개월" title="월별 평균 페이스" />
            <View style={styles.chartCard}>
              <MonthlyPaceChart months={monthlyPaces} />
              <Text style={styles.chartHelp}>
                {'페이스 숫자가 작을수록 더 빠른 기록이에요.'}
              </Text>
            </View>

            <SectionHeader title="구간별 평균" />
            <View style={styles.segmentCard}>
              {distanceSections.map((distance, index) => (
                <View
                  key={distance}
                  style={[
                    styles.segmentRow,
                    index < distanceSections.length - 1 && styles.rowBorder,
                  ]}>
                  <Text style={styles.segmentDistance}>{`${distance}km`}</Text>
                  <Text style={styles.segmentPace}>
                    {formatPace(distancePaces[distance])}
                    {distancePaces[distance] === null ? '' : '/km'}
                  </Text>
                </View>
              ))}
              <Text style={styles.segmentHelp}>
                {'완료한 러닝의 총 거리를 반올림해 구간별 평균을 계산했어요.'}
              </Text>
            </View>

            <SectionHeader title="러너 레벨" />
            <View style={styles.levelCard}>
              <Text style={styles.expText}>
                {`현재 누적 ${summary?.user.totalExp ?? 0} EXP`}
              </Text>
              {runnerLevels.map((level, index) => (
                <View key={level} style={styles.levelRow}>
                  <View style={styles.levelDot} />
                  <Text style={styles.levelText}>{level}</Text>
                  {index < runnerLevels.length - 1 ? (
                    <View style={styles.levelLine} />
                  ) : null}
                </View>
              ))}
              <Text style={styles.levelHelp}>
                {'레벨별 EXP 기준은 정책 확정 후 현재 단계 강조에 연결할 예정이에요.'}
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MessageCard({ message }: { message: string }) {
  return (
    <View style={styles.messageCard}>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

function SectionHeader({
  subtitle,
  title,
}: {
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function MonthlyPaceChart({ months }: { months: MonthPace[] }) {
  const paceValues = months
    .map((month) => month.pace)
    .filter((pace): pace is number => pace !== null);
  const fastest = paceValues.length > 0 ? Math.min(...paceValues) : 0;
  const slowest = paceValues.length > 0 ? Math.max(...paceValues) : 0;

  return (
    <View style={styles.chartRow}>
      {months.map((month) => {
        const height = getBarHeight(month.pace, fastest, slowest);

        return (
          <View key={month.key} style={styles.chartColumn}>
            <Text style={styles.chartPace}>{formatPace(month.pace)}</Text>
            <View style={styles.barArea}>
              <View
                style={[
                  styles.chartBar,
                  month.pace === null && styles.emptyBar,
                  { height },
                ]}
              />
            </View>
            <Text style={styles.monthLabel}>{month.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function calculateMonthlyPaces(sessions: RunningHistoryItem[]): MonthPace[] {
  return getRecentMonths().map((month) => ({
    ...month,
    pace: weightedAveragePace(
      sessions.filter((session) => {
        const startedAt = new Date(session.startedAt);
        return getMonthKey(startedAt) === month.key;
      }),
    ),
  }));
}

function calculateDistancePaces(sessions: RunningHistoryItem[]) {
  return distanceSections.reduce<Record<number, number | null>>(
    (result, distance) => {
      result[distance] = weightedAveragePace(
        sessions.filter((session) =>
          session.distance !== null
            ? Math.round(session.distance / 1000) === distance
            : false,
        ),
      );
      return result;
    },
    {},
  );
}

function weightedAveragePace(sessions: RunningHistoryItem[]) {
  const validSessions = sessions.filter(
    (session) =>
      session.averagePace !== null &&
      session.averagePace > 0 &&
      session.distance !== null &&
      session.distance > 0,
  );

  if (validSessions.length === 0) {
    return null;
  }

  const totalDistance = validSessions.reduce(
    (sum, session) => sum + (session.distance ?? 0),
    0,
  );
  const weightedPace = validSessions.reduce(
    (sum, session) =>
      sum + (session.averagePace ?? 0) * (session.distance ?? 0),
    0,
  );

  return Math.round(weightedPace / totalDistance);
}

function getRecentMonths() {
  const now = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);

    return {
      key: getMonthKey(date),
      label: `${date.getMonth() + 1}월`,
    };
  });
}

function getRecentSixMonthPeriod() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  return {
    from: toLocalDateString(from),
    to: toLocalDateString(now),
  };
}

function getMonthlyComparison(months: MonthPace[]) {
  const currentPace = months.at(-1)?.pace ?? null;
  const previousPace = months.at(-2)?.pace ?? null;

  if (currentPace === null || previousPace === null) {
    return '지난 달과 비교할 기록이 부족해요.';
  }

  const difference = previousPace - currentPace;

  if (difference > 0) {
    return `지난 달 대비 ${difference}초 향상`;
  }
  if (difference < 0) {
    return `지난 달 대비 ${Math.abs(difference)}초 느려짐`;
  }

  return '지난 달과 같은 페이스예요.';
}

function getBarHeight(
  pace: number | null,
  fastest: number,
  slowest: number,
) {
  if (pace === null) {
    return 4;
  }
  if (fastest === slowest) {
    return 68;
  }

  return 34 + ((slowest - pace) / (slowest - fastest)) * 58;
}

function formatPace(pace: number | null) {
  if (pace === null || pace <= 0) {
    return '--';
  }

  const minutes = Math.floor(pace / 60);
  const seconds = String(Math.round(pace % 60)).padStart(2, '0');

  return `${minutes}'${seconds}"`;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
