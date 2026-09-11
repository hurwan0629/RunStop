import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCourseDetail } from '@/features/course/api/courseApi';
import { CourseMap } from '@/features/course/components/CourseMap';
import type { LocationPoint } from '@/features/course/types';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import {
  finishRunningSession,
  saveRunningTrackpoints,
} from '../api/runningApi';
import type { RunningTrackpoint } from '../types';
import { styles } from './RunningScreen.styles';

export default function ActiveRunningScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    courseId?: string;
    sessionId?: string;
  }>();
  const { accessToken } = useAuth();
  const courseId = Number(params.courseId);
  const sessionId = Number(params.sessionId);
  const [plannedPath, setPlannedPath] = useState<LocationPoint[]>([]);
  const [trackedPath, setTrackedPath] = useState<LocationPoint[]>([]);
  const [currentLocation, setCurrentLocation] =
    useState<LocationPoint | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocating, setIsLocating] = useState(true);
  const [isFinishing, setIsFinishing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pendingTrackpoints = useRef<RunningTrackpoint[]>([]);
  const activeSend = useRef<Promise<void> | null>(null);
  const lastPoint = useRef<LocationPoint | null>(null);

  useEffect(() => {
    if (!accessToken || !Number.isInteger(courseId) || courseId <= 0) {
      return;
    }

    getCourseDetail(accessToken, courseId)
      .then((detail) => setPlannedPath(detail.path))
      .catch((error) => setErrorMessage(getApiErrorMessage(error)));
  }, [accessToken, courseId]);

  const flushTrackpoints = useCallback(async () => {
    if (
      !accessToken ||
      !Number.isInteger(sessionId) ||
      sessionId <= 0 ||
      pendingTrackpoints.current.length === 0
    ) {
      return;
    }

    if (activeSend.current) {
      await activeSend.current;
    }

    if (pendingTrackpoints.current.length === 0) {
      return;
    }

    const batch = pendingTrackpoints.current.splice(
      0,
      pendingTrackpoints.current.length,
    );

    const request = saveRunningTrackpoints(accessToken, sessionId, batch)
      .then(() => undefined)
      .catch((error) => {
        pendingTrackpoints.current.unshift(...batch);
        setErrorMessage(getApiErrorMessage(error));
        throw error;
      });

    activeSend.current = request;

    try {
      await request;
    } finally {
      activeSend.current = null;
    }
  }, [accessToken, sessionId]);

  useEffect(() => {
    if (isPaused || isFinishing) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isFinishing, isPaused]);

  useEffect(() => {
    if (
      isPaused ||
      isFinishing ||
      !accessToken ||
      !Number.isInteger(sessionId) ||
      sessionId <= 0
    ) {
      return;
    }

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    const startTracking = async () => {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (permission.status !== 'granted') {
          throw new Error('러닝을 기록하려면 위치 권한이 필요합니다.');
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 3000,
          },
          (location) => {
            if (cancelled) {
              return;
            }

            const point: LocationPoint = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            };
            const trackpoint: RunningTrackpoint = {
              ...point,
              accuracy: location.coords.accuracy ?? undefined,
              clientTrackpointId: createUuid(),
              recordedAt: new Date(location.timestamp).toISOString(),
            };

            setCurrentLocation(point);
            setTrackedPath((current) => [...current, point]);
            setIsLocating(false);

            if (lastPoint.current) {
              setDistanceMeters(
                (current) => current + getDistanceMeters(lastPoint.current!, point),
              );
            }
            lastPoint.current = point;
            pendingTrackpoints.current.push(trackpoint);

            if (pendingTrackpoints.current.length >= 5) {
              void flushTrackpoints().catch(() => undefined);
            }
          },
        );
      } catch (error) {
        setIsLocating(false);
        setErrorMessage(
          error instanceof Error ? error.message : getApiErrorMessage(error),
        );
      }
    };

    void startTracking();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [accessToken, flushTrackpoints, isFinishing, isPaused, sessionId]);

  const handleFinish = async () => {
    if (
      !accessToken ||
      !Number.isInteger(sessionId) ||
      sessionId <= 0 ||
      isFinishing
    ) {
      return;
    }

    setIsFinishing(true);
    setIsPaused(true);
    setErrorMessage('');

    try {
      await flushTrackpoints();
      const result = await finishRunningSession(accessToken, sessionId);
      router.replace({
        pathname: '/running/result',
        params: {
          averagePace:
            result.averagePace === null ? '' : String(result.averagePace),
          distance: String(result.distance),
          elapsedSeconds: String(elapsedSeconds),
          sessionId: String(result.sessionIdx),
        },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setIsFinishing(false);
      setIsPaused(false);
    }
  };

  const confirmFinish = () => {
    Alert.alert(
      '러닝을 종료할까요?',
      '현재까지 저장된 위치로 거리와 페이스를 계산합니다.',
      [
        { text: '계속 달리기', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => void handleFinish() },
      ],
    );
  };

  if (!accessToken || !Number.isInteger(sessionId) || sessionId <= 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerCard}>
          <Text style={styles.errorText}>
            {'러닝 세션을 시작할 수 없습니다. 코스 상세에서 다시 시작해 주세요.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.runningHeader}>
        <Text style={styles.runningTitle}>
          {isPaused ? '일시정지' : '러닝 중'}
        </Text>
        <Text style={styles.gpsState}>
          {isLocating ? 'GPS 연결 중' : 'GPS 연결됨'}
        </Text>
      </View>

      <CourseMap
        currentLocation={currentLocation ?? undefined}
        followCurrentLocation
        routePath={plannedPath}
        startPoint={plannedPath[0]}
        style={styles.runningMap}
        trackedRoutePath={trackedPath}
      />

      <View style={styles.livePanel}>
        <Text style={styles.timeValue}>{formatDuration(elapsedSeconds)}</Text>
        <Text style={styles.timeLabel}>{'러닝 시간'}</Text>
        <View style={styles.metricRow}>
          <Metric label="현재 거리" value={`${(distanceMeters / 1000).toFixed(2)}km`} />
          <Metric
            label="현재 평균 페이스"
            value={formatLivePace(elapsedSeconds, distanceMeters)}
          />
          <Metric label="GPS 포인트" value={String(trackedPath.length)} />
        </View>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <View style={styles.controlRow}>
          <Pressable
            disabled={isFinishing}
            onPress={() => setIsPaused((current) => !current)}
            style={({ pressed }) => [
              styles.pauseButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.pauseButtonText}>
              {isPaused ? '다시 시작' : '일시정지'}
            </Text>
          </Pressable>
          <Pressable
            disabled={isFinishing}
            onPress={confirmFinish}
            style={({ pressed }) => [
              styles.finishButton,
              pressed && styles.pressed,
            ]}>
            {isFinishing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.finishButtonText}>{'러닝 종료'}</Text>
            )}
          </Pressable>
        </View>
      </View>
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

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function formatLivePace(elapsedSeconds: number, distanceMeters: number) {
  if (distanceMeters < 10) {
    return '--';
  }

  const pace = elapsedSeconds / (distanceMeters / 1000);
  const minutes = Math.floor(pace / 60);
  const seconds = String(Math.round(pace % 60)).padStart(2, '0');

  return `${minutes}'${seconds}"/km`;
}

function createUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
}

function getDistanceMeters(from: LocationPoint, to: LocationPoint) {
  const earthRadius = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
