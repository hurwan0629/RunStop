import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getRunningPace } from '@/features/running/api/runningApi';
import type { RunningPaceResponse } from '@/features/running/types';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { styles } from './RecordDetailScreen.styles';

export default function RecordDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    averagePace?: string;
    distance?: string;
    finishedAt?: string;
    sessionId?: string;
    startedAt?: string;
  }>();
  const { accessToken } = useAuth();
  const sessionId = Number(params.sessionId);
  const [pace, setPace] = useState<RunningPaceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadPace = useCallback(async () => {
    if (!accessToken || !Number.isInteger(sessionId) || sessionId <= 0) {
      setErrorMessage('기록을 확인할 수 없습니다.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      setPace(await getRunningPace(accessToken, sessionId));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, sessionId]);

  useEffect(() => {
    void loadPace();
  }, [loadPace]);

  const distance = Number(params.distance) || 0;
  const duration = getDuration(params.startedAt, params.finishedAt);
  const averagePace =
    pace?.averagePace ?? (Number(params.averagePace) || null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backButton}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{'기록 상세'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.recordDate}>
          {params.startedAt ? formatDate(params.startedAt) : `러닝 #${sessionId}`}
        </Text>
        <View style={styles.summaryCard}>
          <Metric label="거리" value={distance ? `${(distance / 1000).toFixed(2)}km` : '--'} />
          <Metric label="시간" value={formatDuration(duration)} />
          <Metric label="평균 페이스" value={formatPace(averagePace)} />
        </View>

        <Text style={styles.sectionTitle}>{'1km 구간별 페이스'}</Text>
        {isLoading ? <ActivityIndicator color="#100078" /> : null}
        {errorMessage ? (
          <View style={styles.messageCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={() => void loadPace()}>
              <Text style={styles.retryText}>{'다시 불러오기'}</Text>
            </Pressable>
          </View>
        ) : null}
        {!isLoading && !errorMessage && pace?.segments.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>
              {'구간 분석을 만들기에 기록이 부족합니다.'}
            </Text>
          </View>
        ) : null}
        {pace?.segments.map((segment, index) => (
          <View key={`${segment.distanceFrom}-${segment.distanceTo}`} style={styles.segmentRow}>
            <Text style={styles.segmentLabel}>{`${index + 1}km 구간`}</Text>
            <Text style={styles.segmentValue}>{formatPace(segment.pace)}</Text>
          </View>
        ))}

        <Text style={styles.mapNotice}>
          {'과거 이동 경로 지도는 서버의 트랙포인트 조회 API가 추가되면 연결할 수 있어요.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricItem}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getDuration(startedAt?: string, finishedAt?: string) {
  if (!startedAt || !finishedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      (new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    ),
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(totalSeconds: number) {
  if (totalSeconds <= 0) {
    return '--';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return `${minutes}분 ${seconds}초`;
}

function formatPace(value: number | null) {
  if (value === null || value <= 0) {
    return '--';
  }

  const minutes = Math.floor(value / 60);
  const seconds = String(Math.round(value % 60)).padStart(2, '0');

  return `${minutes}'${seconds}"/km`;
}
