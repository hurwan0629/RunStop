import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCourseDraft } from '@/features/course/context/CourseDraftContext';

import {
  mockCourseBookmarks,
  mockPlaceBookmarks,
} from '../mocks/mockBookmarks';
import type {
  CourseBookmarkPreview,
  PlaceBookmarkPreview,
} from '../types';
import { styles } from './BookmarksScreen.styles';

type BookmarkTab = 'COURSE' | 'PLACE';

/** 저장한 코스와 장소를 나누어 표시하는 즐겨찾기 화면입니다. */
export default function BookmarksScreen() {
  const router = useRouter();
  const { updateDraft } = useCourseDraft();
  const [activeTab, setActiveTab] = useState<BookmarkTab>('COURSE');
  const [courses, setCourses] = useState(mockCourseBookmarks);
  const [places, setPlaces] = useState(mockPlaceBookmarks);

  const usePlaceAsStart = (place: PlaceBookmarkPreview) => {
    updateDraft({ startPoint: place });
    router.push('/course');
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
        <Text style={styles.mockNotice}>
          {'현재는 백엔드 연결 전이라 화면 확인용 즐겨찾기가 표시됩니다.'}
        </Text>

        {activeTab === 'COURSE' ? (
          courses.length > 0 ? (
            courses.map((course) => (
              <CourseBookmarkCard
                course={course}
                key={course.id}
                onOpen={() =>
                  router.push({
                    pathname: '/course/[courseId]',
                    params: { courseId: course.courseId },
                  })
                }
                onRemove={() =>
                  setCourses((current) =>
                    current.filter((item) => item.id !== course.id),
                  )
                }
              />
            ))
          ) : (
            <EmptyBookmarks type="코스" />
          )
        ) : places.length > 0 ? (
          places.map((place) => (
            <PlaceBookmarkCard
              key={place.id}
              onRemove={() =>
                setPlaces((current) =>
                  current.filter((item) => item.id !== place.id),
                )
              }
              onUse={() => usePlaceAsStart(place)}
              place={place}
            />
          ))
        ) : (
          <EmptyBookmarks type="장소" />
        )}
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
  course: CourseBookmarkPreview;
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
            {`${course.distanceKm}km · 오르막 ${course.totalAscentM}m · ${course.slopeLabel}`}
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

      <View style={styles.tagRow}>
        {course.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
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
  place: PlaceBookmarkPreview;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.placeMark}>
          <Text style={styles.placeMarkText}>{'P'}</Text>
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{place.name}</Text>
          <Text style={styles.categoryText}>{place.category}</Text>
          <Text style={styles.cardSubtitle}>{place.address}</Text>
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
