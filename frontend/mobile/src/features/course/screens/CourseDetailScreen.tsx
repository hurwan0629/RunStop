import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createRouteBookmark,
  deleteRouteBookmark,
  getRouteBookmarks,
} from '@/features/bookmarks/api/bookmarksApi';
import { startRunningSession } from '@/features/running/api/runningApi';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { getCourseDetail } from '../api/courseApi';
import { CourseMap } from '../components/CourseMap';
import type { LocationPoint, RouteDetail } from '../types';
import { styles } from './CourseDetailScreen.styles';

export default function CourseDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const { accessToken } = useAuth();
  const courseId = Number(params.courseId);
  const [course, setCourse] = useState<RouteDetail | null>(null);
  const [bookmarkIdx, setBookmarkIdx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadCourse = useCallback(async () => {
    if (!accessToken || !Number.isInteger(courseId) || courseId <= 0) {
      setErrorMessage('코스 정보를 확인할 수 없습니다.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const detail = await getCourseDetail(accessToken, courseId);
      setCourse(detail);

      if (detail.isBookmarked) {
        const bookmarks = await getRouteBookmarks(accessToken);
        const bookmark = bookmarks.items.find(
          (item) => item.routeRecommendationIdx === detail.idx,
        );
        setBookmarkIdx(bookmark?.bookmarkIdx ?? null);
      } else {
        setBookmarkIdx(null);
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, courseId]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  const points = useMemo(() => splitRoutePoints(course), [course]);

  const toggleBookmark = async () => {
    if (!accessToken || !course || isWorking) {
      return;
    }

    setIsWorking(true);
    setErrorMessage('');

    try {
      if (bookmarkIdx !== null) {
        await deleteRouteBookmark(accessToken, bookmarkIdx);
        setBookmarkIdx(null);
        setCourse({ ...course, isBookmarked: false });
      } else {
        const created = await createRouteBookmark(accessToken, course.idx);
        setBookmarkIdx(created.bookmarkIdx);
        setCourse({ ...course, isBookmarked: true });
      }
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsWorking(false);
    }
  };

  const startRunning = async () => {
    if (!accessToken || !course || isWorking) {
      return;
    }

    setIsWorking(true);
    setErrorMessage('');

    try {
      const session = await startRunningSession(accessToken, course.idx);
      router.push({
        pathname: '/running/active',
        params: {
          courseId: String(course.idx),
          sessionId: String(session.sessionIdx),
        },
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.backButton}>{'‹'}</Text>
        </Pressable>
        <Text style={styles.screenTitle}>{'코스 상세'}</Text>
        <Pressable
          disabled={!course || isWorking}
          onPress={() => void toggleBookmark()}
          hitSlop={10}>
          <Text style={styles.bookmarkButton}>
            {course?.isBookmarked ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#100078" style={styles.loader} />
      ) : errorMessage && !course ? (
        <View style={styles.centerCard}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable onPress={() => void loadCourse()}>
            <Text style={styles.retryText}>{'다시 불러오기'}</Text>
          </Pressable>
        </View>
      ) : course ? (
        <ScrollView contentContainerStyle={styles.content}>
          <CourseMap
            endPoint={points.endPoint}
            routePath={course.path}
            startPoint={points.startPoint}
            style={styles.map}
            waypoints={points.waypoints}
          />
          <Text style={styles.courseName}>{course.name}</Text>
          <View style={styles.metricRow}>
            <Metric
              label="거리"
              value={course.totalDistance === null ? '--' : `${(course.totalDistance / 1000).toFixed(1)}km`}
            />
            <Metric
              label="누적 오르막"
              value={course.totalAscent === null ? '--' : `${Math.round(course.totalAscent)}m`}
            />
            <Metric
              label="경사도 편차"
              value={course.slopeStd === null ? '--' : course.slopeStd.toFixed(1)}
            />
          </View>
          {course.path.length < 2 ? (
            <Text style={styles.noticeText}>
              {'아직 경로 좌표가 없어 지도 선은 표시되지 않습니다.'}
            </Text>
          ) : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <Pressable
            disabled={isWorking}
            onPress={() => void startRunning()}
            style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
            {isWorking ? (
              <ActivityIndicator color="#C8FF30" />
            ) : (
              <Text style={styles.startButtonText}>{'러닝 시작'}</Text>
            )}
          </Pressable>
        </ScrollView>
      ) : null}
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

function splitRoutePoints(course: RouteDetail | null): {
  startPoint?: LocationPoint;
  endPoint?: LocationPoint;
  waypoints: LocationPoint[];
} {
  if (!course) {
    return { waypoints: [] };
  }

  const start = course.points.find((point) => point.pointType === 'START');
  const end = course.points.find((point) => point.pointType === 'END');

  return {
    startPoint: start ?? course.path[0],
    endPoint: end ?? course.path.at(-1),
    waypoints: course.points.filter((point) => point.pointType === 'WAYPOINT'),
  };
}
