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

import { useCourseDraft } from '@/features/course/context/CourseDraftContext';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import {
  deletePointBookmark,
  deleteRouteBookmark,
  getPointBookmarks,
  getRouteBookmarks,
} from '../api/bookmarksApi';
import type { CourseBookmark, PointBookmark } from '../types';
import { styles } from './BookmarksScreen.styles';

type BookmarkTab = 'COURSE' | 'PLACE';

export default function BookmarksScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { updateDraft } = useCourseDraft();
  const [activeTab, setActiveTab] = useState<BookmarkTab>('COURSE');
  const [courses, setCourses] = useState<CourseBookmark[]>([]);
  const [places, setPlaces] = useState<PointBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadBookmarks = useCallback(async () => {
    if (!accessToken) {
      setCourses([]);
      setPlaces([]);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const [routeResponse, pointResponse] = await Promise.all([
        getRouteBookmarks(accessToken),
        getPointBookmarks(accessToken),
      ]);
      setCourses(routeResponse.items);
      setPlaces(pointResponse.items);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const setPlaceAsStart = (place: PointBookmark) => {
    updateDraft({
      startPoint: {
        id: String(place.bookmarkIdx),
        name: place.name,
        lat: place.point.latitude,
        lng: place.point.longitude,
      },
    });
    router.push('/course');
  };

  const removeCourse = async (course: CourseBookmark) => {
    if (!accessToken) {
      return;
    }

    try {
      await deleteRouteBookmark(accessToken, course.bookmarkIdx);
      setCourses((current) =>
        current.filter((item) => item.bookmarkIdx !== course.bookmarkIdx),
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    }
  };

  const removePlace = async (place: PointBookmark) => {
    if (!accessToken) {
      return;
    }

    try {
      await deletePointBookmark(accessToken, place.bookmarkIdx);
      setPlaces((current) =>
        current.filter((item) => item.bookmarkIdx !== place.bookmarkIdx),
      );
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
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
        <Text style={styles.screenTitle}>{'즐겨찾기'}</Text>
      </View>

      <View style={styles.tabRow}>
        <TabButton
          active={activeTab === 'COURSE'}
          label={`코스 ${courses.length}`}
          onPress={() => setActiveTab('COURSE')}
        />
        <TabButton
          active={activeTab === 'PLACE'}
          label={`장소 ${places.length}`}
          onPress={() => setActiveTab('PLACE')}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {!accessToken ? (
          <Text style={styles.mockNotice}>
            {'로그인 후 즐겨찾기를 확인할 수 있어요.'}
          </Text>
        ) : null}
        {isLoading ? <ActivityIndicator color="#100078" /> : null}
        {errorMessage ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyDescription}>{errorMessage}</Text>
            <Pressable onPress={() => void loadBookmarks()}>
              <Text style={styles.outlineButtonText}>{'다시 불러오기'}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !errorMessage && activeTab === 'COURSE' ? (
          courses.length > 0 ? (
            courses.map((course) => (
              <CourseBookmarkCard
                course={course}
                key={course.bookmarkIdx}
                onOpen={() =>
                  router.push({
                    pathname: '/course/[courseId]',
                    params: {
                      courseId: String(course.routeRecommendationIdx),
                    },
                  })
                }
                onRemove={() => void removeCourse(course)}
              />
            ))
          ) : (
            <EmptyBookmarks type="코스" />
          )
        ) : null}

        {!isLoading && !errorMessage && activeTab === 'PLACE' ? (
          places.length > 0 ? (
            places.map((place) => (
              <PlaceBookmarkCard
                key={place.bookmarkIdx}
                onRemove={() => void removePlace(place)}
                onUse={() => setPlaceAsStart(place)}
                place={place}
              />
            ))
          ) : (
            <EmptyBookmarks type="장소" />
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TabButton({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CourseBookmarkCard({
  course,
  onOpen,
  onRemove,
}: {
  course: CourseBookmark;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.courseMark}>
          <Text style={styles.courseMarkText}>{'R'}</Text>
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{course.name}</Text>
          <Text style={styles.cardSubtitle}>
            {formatCourseDescription(course)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`${course.name} 즐겨찾기 해제`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRemove}>
          <Text style={styles.bookmarkButton}>{'★'}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => [
          styles.outlineButton,
          pressed && styles.pressed,
        ]}>
        <Text style={styles.outlineButtonText}>{'코스 상세 보기'}</Text>
      </Pressable>
    </View>
  );
}

function PlaceBookmarkCard({
  onRemove,
  onUse,
  place,
}: {
  onRemove: () => void;
  onUse: () => void;
  place: PointBookmark;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.placeMark}>
          <Text style={styles.placeMarkText}>{'P'}</Text>
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{place.name}</Text>
          <Text style={styles.cardSubtitle}>
            {`${place.point.latitude.toFixed(5)}, ${place.point.longitude.toFixed(5)}`}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={`${place.name} 즐겨찾기 해제`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRemove}>
          <Text style={styles.bookmarkButton}>{'★'}</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onUse}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}>
        <Text style={styles.primaryButtonText}>{'출발지로 사용하기'}</Text>
      </Pressable>
    </View>
  );
}

function EmptyBookmarks({ type }: { type: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyStar}>{'☆'}</Text>
      <Text style={styles.emptyTitle}>{`즐겨찾기한 ${type}가 없어요`}</Text>
      <Text style={styles.emptyDescription}>
        {`마음에 드는 ${type}를 저장하면 여기에 모아볼 수 있어요.`}
      </Text>
    </View>
  );
}

function formatCourseDescription(course: CourseBookmark) {
  const distance = course.totalDistance === null
    ? '거리 정보 없음'
    : `${(course.totalDistance / 1000).toFixed(1)}km`;
  const ascent = course.totalAscent === null
    ? '오르막 정보 없음'
    : `오르막 ${Math.round(course.totalAscent)}m`;

  return `${distance} · ${ascent}`;
}
