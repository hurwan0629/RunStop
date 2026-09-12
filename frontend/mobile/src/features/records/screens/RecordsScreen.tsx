import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { getRunningHistoryForPeriod } from '../api/recordsApi';
import type { RunningRecordPreview } from '../types';
import { styles } from './RecordsScreen.styles';

type PeriodFilter = 'WEEK' | 'MONTH' | 'ALL';

const periodOptions: { label: string; value: PeriodFilter }[] = [
  { label: '이번 주', value: 'WEEK' },
  { label: '이번 달', value: 'MONTH' },
  { label: '전체', value: 'ALL' },
];

export default function RecordsScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [records, setRecords] = useState<RunningRecordPreview[]>([]);
  const [period, setPeriod] = useState<PeriodFilter>('MONTH');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRecords = useCallback(async () => {
    if (!accessToken) {
      setRecords([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const items = await getRunningHistoryForPeriod(
        accessToken,
        createPeriod(period),
      );
      setRecords(
        items.map((item) => ({
          ...item,
          courseName: `러닝 기록 #${item.idx}`,
        })),
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, period]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const summary = useMemo(() => calculateSummary(records), [records]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="뒤로 가기"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}>
            <Text style={styles.backButton}>{'‹'}</Text>
          </Pressable>
          <Text style={styles.screenTitle}>{'러닝 기록'}</Text>
        </View>

        <View style={styles.filterRow}>
          {periodOptions.map((option) => {
            const active = period === option.value;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={option.value}
                onPress={() => setPeriod(option.value)}
                style={({ pressed }) => [
                  styles.filterButton,
                  active && styles.filterButtonActive,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <SummaryMetric
            label="총 거리"
            unit="km"
            value={(summary.distance / 1000).toFixed(1)}
          />
          <SummaryMetric
            label="러닝 횟수"
            unit="회"
            value={String(summary.count)}
          />
          <SummaryMetric
            label="최장 거리"
            unit="km"
            value={(summary.longestDistance / 1000).toFixed(1)}
          />
        </View>

        {isLoading ? (
          <ActivityIndicator color="#100078" style={{ marginTop: 28 }} />
        ) : null}
        {!accessToken ? (
          <Text style={styles.mockNotice}>
            {'로그인 후 러닝 기록을 확인할 수 있어요.'}
          </Text>
        ) : null}
        {errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyDescription}>{errorMessage}</Text>
            <Pressable onPress={() => void loadRecords()}>
              <Text style={styles.openText}>{'다시 불러오기'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{'러닝 내역'}</Text>
          <Text style={styles.resultCount}>{`${records.length}개`}</Text>
        </View>

        {!isLoading && !errorMessage && records.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyMark} />
            <Text style={styles.emptyTitle}>{'이 기간에는 기록이 없어요'}</Text>
            <Text style={styles.emptyDescription}>
              {'기간을 바꾸거나 새로운 러닝을 시작해 보세요.'}
            </Text>
          </View>
        ) : (
          records.map((record) => (
            <RecordCard
              key={record.idx}
              onPress={() =>
                router.push({
                  pathname: '/records/[sessionId]',
                  params: {
                    averagePace: String(record.averagePace ?? ''),
                    distance: String(record.distance ?? ''),
                    finishedAt: record.finishedAt ?? '',
                    sessionId: String(record.idx),
                    startedAt: record.startedAt,
                  },
                })
              }
              record={record}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryMetric({
  label,
  unit,
  value,
}: {
  label: string;
  unit: string;
  value: string;
}) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <View style={styles.summaryValueRow}>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryUnit}>{unit}</Text>
      </View>
    </View>
  );
}

function RecordCard({
  onPress,
  record,
}: {
  onPress: () => void;
  record: RunningRecordPreview;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.recordCard,
        pressed && styles.pressed,
      ]}>
      <View style={styles.recordHeader}>
        <View>
          <Text style={styles.recordDate}>{formatRecordDate(record.startedAt)}</Text>
          <Text style={styles.recordName}>{record.courseName}</Text>
        </View>
        <Text style={styles.recordChevron}>{'›'}</Text>
      </View>

      <View style={styles.recordMetrics}>
        <RecordMetric
          label="거리"
          value={record.distance ? `${(record.distance / 1000).toFixed(1)}km` : '--'}
        />
        <RecordMetric
          label="시간"
          value={formatDuration(getDurationSeconds(record))}
        />
        <RecordMetric
          label="평균 페이스"
          value={formatPace(record.averagePace)}
        />
      </View>
    </Pressable>
  );
}

function RecordMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recordMetric}>
      <Text style={styles.recordMetricValue}>{value}</Text>
      <Text style={styles.recordMetricLabel}>{label}</Text>
    </View>
  );
}

function calculateSummary(records: RunningRecordPreview[]) {
  return records.reduce(
    (summary, record) => ({
      distance: summary.distance + (record.distance ?? 0),
      durationSeconds: summary.durationSeconds + getDurationSeconds(record),
      count: summary.count + (record.status === 'COMPLETED' ? 1 : 0),
      longestDistance: Math.max(summary.longestDistance, record.distance ?? 0),
    }),
    { distance: 0, durationSeconds: 0, count: 0, longestDistance: 0 },
  );
}

function getDurationSeconds(record: RunningRecordPreview) {
  if (!record.finishedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      (new Date(record.finishedAt).getTime() -
        new Date(record.startedAt).getTime()) /
        1000,
    ),
  );
}

function createPeriod(period: PeriodFilter) {
  const to = new Date();
  const from = new Date(to);

  if (period === 'WEEK') {
    from.setDate(to.getDate() - 6);
  } else if (period === 'MONTH') {
    from.setDate(1);
  } else {
    from.setFullYear(2000, 0, 1);
  }

  return { from: toDateString(from), to: toDateString(to) };
}

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatRecordDate(value: string) {
  return new Date(value).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return '--';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}:${seconds}`;
}

function formatPace(pace: number | null) {
  if (pace === null || pace <= 0) {
    return '--';
  }

  const minutes = Math.floor(pace / 60);
  const seconds = String(Math.round(pace % 60)).padStart(2, '0');

  return `${minutes}'${seconds}"`;
}
