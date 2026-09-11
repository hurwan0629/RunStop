import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createMockRunningRecords } from '../mocks/mockRecords';
import type { RunningRecordPreview } from '../types';
import { styles } from './RecordsScreen.styles';

type PeriodFilter = 'WEEK' | 'MONTH' | 'ALL';

const periodOptions: Array<{ label: string; value: PeriodFilter }> = [
  { label: '이번 주', value: 'WEEK' },
  { label: '이번 달', value: 'MONTH' },
  { label: '전체', value: 'ALL' },
];

/** 기간별 러닝 요약과 완료한 러닝 목록을 표시합니다. */
export default function RecordsScreen() {
  const router = useRouter();
  const records = useMemo(() => createMockRunningRecords(), []);
  const [period, setPeriod] = useState<PeriodFilter>('MONTH');
  const visibleRecords = useMemo(
    () => filterRecords(records, period),
    [period, records],
  );
  const summary = useMemo(
    () => calculateSummary(visibleRecords),
    [visibleRecords],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>{'러닝 기록'}</Text>
        <Text style={styles.screenDescription}>
          {'달린 거리와 페이스를 기간별로 확인해 보세요.'}
        </Text>

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
          <View style={styles.summaryDivider} />
          <SummaryMetric
            label="러닝 시간"
            unit="분"
            value={String(Math.round(summary.durationSeconds / 60))}
          />
          <View style={styles.summaryDivider} />
          <SummaryMetric
            label="완료"
            unit="회"
            value={String(summary.count)}
          />
        </View>
        <Text style={styles.mockNotice}>
          {'현재는 백엔드 연결 전이라 화면 확인용 기록이 표시됩니다.'}
        </Text>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{'러닝 내역'}</Text>
          <Text style={styles.resultCount}>{`${visibleRecords.length}개`}</Text>
        </View>

        {visibleRecords.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyMark} />
            <Text style={styles.emptyTitle}>{'이 기간에는 기록이 없어요'}</Text>
            <Text style={styles.emptyDescription}>
              {'기간을 바꾸거나 새로운 러닝을 시작해 보세요.'}
            </Text>
          </View>
        ) : (
          visibleRecords.map((record) => (
            <RecordCard
              key={record.idx}
              onPress={() =>
                router.push({
                  pathname: '/records/[sessionId]',
                  params: { sessionId: String(record.idx) },
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
        <View style={styles.completeBadge}>
          <Text style={styles.completeBadgeText}>{'완료'}</Text>
        </View>
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
      <Text style={styles.openText}>{'상세 기록 보기  ›'}</Text>
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

function filterRecords(
  records: RunningRecordPreview[],
  period: PeriodFilter,
) {
  if (period === 'ALL') {
    return records;
  }

  const now = new Date();

  if (period === 'MONTH') {
    return records.filter((record) => {
      const date = new Date(record.startedAt);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    });
  }

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  return records.filter(
    (record) => new Date(record.startedAt).getTime() >= weekStart.getTime(),
  );
}

function calculateSummary(records: RunningRecordPreview[]) {
  return records.reduce(
    (summary, record) => ({
      distance: summary.distance + (record.distance ?? 0),
      durationSeconds: summary.durationSeconds + getDurationSeconds(record),
      count: summary.count + 1,
    }),
    { distance: 0, durationSeconds: 0, count: 0 },
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

function formatRecordDate(value: string) {
  const date = new Date(value);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${month}월 ${day}일 · ${hour}:${minute}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const restSeconds = String(seconds % 60).padStart(2, '0');

  return `${minutes}:${restSeconds}`;
}

function formatPace(pace: number | null) {
  if (!pace) {
    return '--';
  }

  const minutes = Math.floor(pace / 60);
  const seconds = String(Math.round(pace % 60)).padStart(2, '0');

  return `${minutes}'${seconds}\"`;
}
