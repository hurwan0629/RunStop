
import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Alert,
  type AlertButton,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getPointBookmarks } from '@/features/bookmarks/api/bookmarksApi';
import type { PointBookmark } from '@/features/bookmarks/types';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { CourseMap } from '../components/CourseMap';
import { useCourseDraft } from '../context/CourseDraftContext';
import type { LocationPoint } from '../types';
import { styles } from './CourseSetupScreen.styles';

export default function CourseSetupScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const {
    addWaypointSlot,
    draft,
    removeWaypointSlot,
    setWaypointSlot,
    updateDraft,
    waypointSlots,
  } = useCourseDraft();

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [favoritePlaces, setFavoritePlaces] = useState<PointBookmark[]>([]);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  const loadFavoritePlaces = useCallback(async () => {
    if (!accessToken) {
      setFavoritePlaces([]);
      setFavoritesError(null);
      return;
    }

    try {
      const response = await getPointBookmarks(accessToken);
      setFavoritePlaces(response.items);
      setFavoritesError(null);
    } catch (error) {
      setFavoritePlaces([]);
      setFavoritesError(getApiErrorMessage(error));
    }
  }, [accessToken]);

  // 검색 화면에서 별을 누르고 돌아오면 목록을 바로 새로 불러옵니다.
  useFocusEffect(
    useCallback(() => {
      void loadFavoritePlaces();
    }, [loadFavoritePlaces]),
  );

  const loadCurrentLocation = useCallback(async () => {
    if (isLoadingLocation) {
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const isLocationEnabled = // GPS 켜져있는지 확인
        await Location.hasServicesEnabledAsync();

      if (!isLocationEnabled) {
        throw new Error('기기의 위치 기능을 켜주세요.');
      }

      const permission =  // 위치 권한 요청
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        throw new Error(
          '현재 위치를 확인하려면 위치 권한이 필요합니다.',
        );
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // 현재 위치 가져오기
      });

      const nextLocation: LocationPoint = {
        name: '현재 위치',
        lat: result.coords.latitude,
        lng: result.coords.longitude,
      };

      updateDraft({ startPoint: nextLocation });
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : '현재 위치를 불러오지 못했습니다.',
      );
    } finally {
      setIsLoadingLocation(false);
    }
  }, [isLoadingLocation, updateDraft]);

  const openPlaceSearch = (
    target: 'start' | 'end' | 'waypoint',
    waypointIndex?: number,
  ) => {
    router.push({
      pathname: '/course/place-search',
      params:
        target === 'waypoint'
          ? { target, waypointIndex: String(waypointIndex ?? 0) }
          : { target },
    });
  };

  const confirmCurrentLocation = () => {
    Alert.alert(
      '현재 위치를 출발지로 설정할까요?',
      '현재 위치 권한을 사용해 출발지 좌표를 가져옵니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '현재 위치로 설정',
          onPress: () => void loadCurrentLocation(),
        },
      ],
    );
  };

  const applyFavoritePlace = (place: PointBookmark) => {
    const point: LocationPoint = {
      id: String(place.bookmarkIdx),
      name: place.name,
      lat: place.point.latitude,
      lng: place.point.longitude,
    };
    const emptyWaypointIndex = waypointSlots.findIndex(
      (waypoint) => waypoint === null,
    );
    const buttons: AlertButton[] = [
      {
        text: '출발지로 설정',
        onPress: () => updateDraft({ startPoint: point }),
      },
      {
        text: '도착지로 설정',
        onPress: () => updateDraft({ endPoint: point }),
      },
      { text: '취소', style: 'cancel' },
    ];

    if (emptyWaypointIndex >= 0) {
      buttons.splice(2, 0, {
        text: `경유지 ${emptyWaypointIndex + 1}로 설정`,
        onPress: () => setWaypointSlot(emptyWaypointIndex, point),
      });
    }

    Alert.alert(
      `${place.name} 사용`,
      '이 장소를 어디에 설정할까요?',
      buttons,
    );
  };

  const handleNext = () => {
    if (!draft.startPoint) {
      Alert.alert(
        '출발지를 설정해 주세요',
        '출발지를 검색하거나 현재 위치 버튼을 눌러 설정할 수 있어요.',
      );
      return;
    }

    router.push('/course/conditions');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityLabel="뒤로 가기"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => router.back()}>
            <Text style={styles.backButton}>{'‹'}</Text>
          </Pressable>
          <Text style={styles.title}>{'코스 설정'}</Text>
          <View style={styles.stepBadge}>
            <Text style={styles.stepText}>{'1 / 4'}</Text>
          </View>
        </View>

        <CourseMap
          endPoint={draft.endPoint}
          startPoint={draft.startPoint}
          style={styles.map}
          waypoints={draft.waypoints}
        />

        <View style={styles.routeForm}>
          <SearchRow
            actionDisabled={isLoadingLocation}
            actionLabel={isLoadingLocation ? '불러오는 중' : '현재 위치'}
            label="출발지"
            onActionPress={confirmCurrentLocation}
            onClear={() => {
              setLocationError(null);
              updateDraft({ startPoint: undefined });
            }}
            onPress={() => openPlaceSearch('start')}
            placeholder="검색"
            value={draft.startPoint?.name}
          />

          {locationError ? (
            <Text style={styles.errorText}>{locationError}</Text>
          ) : null}

          {waypointSlots.map((waypoint, index) => (
            <SearchRow
              key={`waypoint-slot-${index}`}
              label={`경유지 ${index + 1}`}
              onClear={() => setWaypointSlot(index, null)}
              onPress={() => openPlaceSearch('waypoint', index)}
              onRemove={() => removeWaypointSlot(index)}
              placeholder="검색"
              value={waypoint?.name}
            />
          ))}

          <SearchRow
            label="도착지"
            onClear={() => updateDraft({ endPoint: undefined })}
            onPress={() => openPlaceSearch('end')}
            placeholder="검색 (미입력 시 순환 코스)"
            value={draft.endPoint?.name}
          />

          {waypointSlots.length < 2 ? (
            <Pressable
              accessibilityRole="button"
              onPress={addWaypointSlot}
              style={({ pressed }) => [
                styles.waypointButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.waypointButtonText}>{'⊕  경유지 추가'}</Text>
            </Pressable>
          ) : null}

          <View style={styles.favoriteSection}>
            <Text style={styles.favoriteTitle}>{'즐겨찾기 장소'}</Text>
            {!accessToken ? (
              <Text style={styles.favoriteHint}>
                {'로그인 후 저장한 장소를 여기에서 바로 사용할 수 있어요.'}
              </Text>
            ) : null}
            {favoritesError ? (
              <Text style={styles.favoriteHint}>{favoritesError}</Text>
            ) : null}
            {accessToken && !favoritesError && favoritePlaces.length === 0 ? (
              <Text style={styles.favoriteHint}>
                {'검색 결과 오른쪽의 ☆ 버튼으로 장소를 저장해 보세요.'}
              </Text>
            ) : null}
            {favoritePlaces.map((place) => (
              <Pressable
                accessibilityRole="button"
                key={place.bookmarkIdx}
                onPress={() => applyFavoritePlace(place)}
                style={({ pressed }) => [
                  styles.favoritePlace,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.favoriteStar}>{'★'}</Text>
                <View style={styles.favoriteCopy}>
                  <Text style={styles.favoritePlaceName}>{place.name}</Text>
                  <Text style={styles.favoriteCoordinate}>
                    {`${place.point.latitude.toFixed(5)}, ${place.point.longitude.toFixed(5)}`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.nextButtonText}>
            {'다음 — 러닝 조건 설정'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SearchRow({
  actionDisabled = false,
  actionLabel,
  label,
  onActionPress,
  onClear,
  onRemove,
  onPress,
  placeholder,
  value,
}: {
  actionDisabled?: boolean;
  actionLabel?: string;
  label: string;
  onActionPress?: () => void;
  onClear?: () => void;
  onRemove?: () => void;
  onPress: () => void;
  placeholder: string;
  value?: string;
}) {
  return (
    <View style={styles.searchRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.searchInput,
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.searchText, !value && styles.placeholderText]}>
          {value ?? placeholder}
        </Text>
      </Pressable>

      {value && onClear ? (
        <Pressable
          accessibilityLabel={`${label} 입력값 지우기`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClear}
          style={({ pressed }) => [
            styles.clearValueButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.clearValueText}>{'×'}</Text>
        </Pressable>
      ) : null}

      {onActionPress && actionLabel ? (
        <Pressable
          accessibilityRole="button"
          disabled={actionDisabled}
          onPress={onActionPress}
          style={({ pressed }) => [
            styles.currentLocationButton,
            actionDisabled && styles.disabledButton,
            pressed && !actionDisabled && styles.pressed,
          ]}>
          <Text style={styles.currentLocationButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}

      {onRemove ? (
        <Pressable
          accessibilityLabel={`${label} 삭제`}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRemove}
          style={({ pressed }) => [
            styles.removeWaypointButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.removeWaypointText}>{'×'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
