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

import { getRunningDetail } from '@/features/running/api/runningApi';
import type { RunningDetail } from '@/features/running/types';
import { CourseMap } from '@/features/course/components/CourseMap';
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
  const [pace, setPace] = useState<RunningDetail | null>(null);
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
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
      setPace(await getRunningDetail(accessToken, sessionId));
      setSelectedSegment(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, sessionId]);

  useEffect(() => {
    void loadPace();
  }, [loadPace]);

  const distance = pace?.distance ?? (Number(params.distance) || 0);
  const duration = getDuration(pace?.startedAt ?? params.startedAt, pace?.finishedAt ?? params.finishedAt);
  const segment = selectedSegment === null ? null : pace?.segments[selectedSegment];
  const averagePace =
    pace?.averagePace ?? (Number(params.averagePace) || null);
  const conditions = pace?.request?.elementConditions;
  const features = pace?.route?.featureValues;
  const slopeLabel = conditions?.slopePreference
    ? { GENTLE: '완만', NORMAL: '약간 경사짐', ANY: '상관없음' }[conditions.slopePreference]
    : conditions?.maxSlope != null ? `최대 ${conditions.maxSlope}% 요청` : '과거 조건 정보 없음';
  const requestedConditions = conditions ? [
    ['목표 거리', metric(conditions.targetDistance, 'km', .001)],
    ['경사', slopeLabel],
    ['공원·하천', preference(conditions.preferNature)],
    ['신호등·횡단보도 적게', preference(conditions.preferFlow)],
    ['화장실', facilityPreference(conditions.facilityPreferences?.toilet)],
    ['편의점', facilityPreference(conditions.facilityPreferences?.store)],
    ['야간 중요도', metric(conditions.weights?.night, '/5')],
  ] : [];

  // 선택한 추천 경로의 feature를 사용한다. 실제 GPS 구간 분석과 구분해서 표시.
  const routeMetrics = [
    ['실제 코스 거리', metric(pace?.route?.totalDistance, 'km', .001)],
    ['평균 경사', metric(features?.slope?.avgSlopePct, '%')],
    ['최대 경사', metric(features?.slope?.maxSlopePct, '%')],
    ['누적 상승', metric(features?.slope?.elevationGainM ?? pace?.route?.totalAscent, 'm')],
    ['화장실', metric(features?.toilet_count, '개')],
    ['편의점', metric(features?.store_count, '개')],
    ['공원 인접률', metric(features?.nature?.parkRatio, '%', 100)],
    ['하천 인접률', metric(features?.nature?.waterRatio, '%', 100)],
    ...([['cctv_count', 'CCTV'], ['security_count', '보안등'], ['light_count', '가로등']] as const)
      .filter(([key]) => typeof features?.[key] === 'number' && (features[key] as number) > 0)
      .map(([key, label]) => [label, metric(features?.[key], '개')]),
    ['신호등 /km', metric(features?.surface?.signal_per_km)],
    ['횡단보도 /km', metric(features?.surface?.crossing_per_km)],
    ['경로 중복률', metric(features?.overlapRatio, '%', 100)],
  ];

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
          {pace?.startedAt ? formatDate(pace.startedAt) : `러닝 #${sessionId}`}
        </Text>
        <View style={styles.summaryCard}>
          <Metric label="거리" value={distance ? `${(distance / 1000).toFixed(2)}km` : '--'} />
          <Metric label="시간" value={formatDuration(duration)} />
          <Metric label="평균 페이스" value={formatPace(averagePace)} />
        </View>

        {pace ? (
          <>
            <Text style={styles.sectionTitle}>코스와 실제 주행</Text>
            <CourseMap
              startPoint={pace.route?.path[0] ?? pace.trackPaths[0]?.[0]}
              routePath={pace.route?.path ?? []}
              trackedRoutePaths={pace.trackPaths}
              highlightedPath={segment?.path}
              featurePath={segment?.path}
              mapLayers={segment?.environment?.mapLayers}
              facilityPoints={segment?.environment?.facilityPoints}
              averageSlopePct={segment?.environment?.slope?.avgSlopePct}
              showLayerControls={Boolean(segment?.environment)}
            />
            <Text style={styles.mapNotice}>남색: 선택한 코스 · 초록: 실제 주행 · 주황: 선택 구간</Text>
            {!pace.trackPaths.length ? <Text style={styles.messageText}>표시할 유효 GPS 기록이 없습니다.</Text> : null}
            {pace.gapCount || pace.excludedPointCount ? (
              <Text style={styles.messageText}>낮은 정확도 {pace.excludedPointCount}개 제외 · 기록 단절 {pace.gapCount}곳</Text>
            ) : null}
            {pace.analysisStatus === 'UNAVAILABLE' ? (
              <Text style={styles.messageText}>구간 환경 정보를 불러오지 못했습니다. 지도와 주행 기록은 확인할 수 있어요.</Text>
            ) : null}
          </>
        ) : null}

        {pace ? <>
          <Text style={styles.sectionTitle}>추천받을 때의 요청 조건</Text>
          <View style={styles.messageCard}>
            {requestedConditions.length ? requestedConditions.map(([label, value]) => (
              <View style={styles.segmentRow} key={label}><Text style={styles.segmentLabel}>{label}</Text><Text style={styles.segmentValue}>{value}</Text></View>
            )) : <Text style={styles.messageText}>저장된 요청 조건이 없습니다.</Text>}
          </View>
          <Text style={styles.sectionTitle}>선택한 추천 경로의 특징</Text>
          <View style={styles.messageCard}>
            {routeMetrics.map(([label, value]) => <View style={styles.segmentRow} key={label}>
              <Text style={styles.segmentLabel}>{label}</Text><Text style={styles.segmentValue}>{value}</Text>
            </View>)}
            {features?.slopeConstraint?.status === 'RELAXED' ? (
              <Text style={styles.messageText}>{features.slopeConstraint.evaluation === 'UNAVAILABLE'
                ? '경사 정보가 부족해 요청 조건 충족 여부를 확인할 수 없어요.'
                : '경사 탐색 기준을 완화해 찾은 대안 코스예요. 실제 경사 지표를 확인해 주세요.'}</Text>
            ) : null}
            <Text style={styles.mapNotice}>—는 과거 기록에 저장되지 않은 정보입니다.</Text>
          </View>
        </> : null}

        <Text style={styles.sectionTitle}>{'구간별 기록 · 눌러서 지도 확인'}</Text>
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
        {pace?.segments.map((part, index) => (
          <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: index === selectedSegment }}
            onPress={() => setSelectedSegment(index === selectedSegment ? null : index)}
            style={[styles.segmentRow, index === selectedSegment && { backgroundColor: '#FFF0E3' }]}>
            <View>
              <Text style={styles.segmentLabel}>{`${(part.distanceFrom / 1000).toFixed(2)}–${(part.distanceTo / 1000).toFixed(2)}km`}</Text>
              <Text style={styles.segmentLabel}>{formatDuration(Math.round(part.durationSeconds))}</Text>
              <Text style={styles.segmentLabel}>
                {part.environment?.slope?.avgSlopePct == null ? '경사 정보 없음' : `평균 경사 ${part.environment.slope.avgSlopePct.toFixed(1)}%`}
              </Text>
            </View>
            <Text style={styles.segmentValue}>{formatPace(part.pace)}</Text>
          </Pressable>
        ))}

        <Text style={styles.mapNotice}>
          {'구간 시간·페이스는 유효 GPS 기록 기준입니다. 기록이 끊긴 구간은 연결하지 않으며, 경사는 고도 데이터로 계산한 추정값입니다.'}
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

function metric(value: unknown, unit = '', scale = 1) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${(value * scale).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}` : '—';
}

function preference(value?: boolean) {
  return value === undefined ? '기록 없음' : value ? '선호' : '상관없음';
}

function facilityPreference(value?: string) {
  return value === 'PREFER' ? '선호' : value === 'IGNORE' ? '상관없음' : '기록 없음';
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

  const rounded = Math.round(value);
  const minutes = Math.floor(rounded / 60);
  const seconds = String(rounded % 60).padStart(2, '0');

  return `${minutes}'${seconds}"/km`;
}
