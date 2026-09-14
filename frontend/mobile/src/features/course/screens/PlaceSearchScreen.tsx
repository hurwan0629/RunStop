import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createPointBookmark,
  getPointBookmarks,
} from '@/features/bookmarks/api/bookmarksApi';
import type { PointBookmark } from '@/features/bookmarks/types';
import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { searchPlaces } from '../api/placeSearchApi';
import { useCourseDraft } from '../context/CourseDraftContext';
import type { LocationPoint, PlaceSearchItem } from '../types';
import { styles } from './PlaceSearchScreen.styles';

type PlaceTarget = 'start' | 'end' | 'waypoint';

export default function PlaceSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    target?: string;
    waypointIndex?: string;
  }>();
  const { accessToken } = useAuth();
  const { setWaypointSlot, updateDraft } = useCourseDraft();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchItem[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<PointBookmark[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const target = useMemo<PlaceTarget>(() => {
    if (params.target === 'end') {
      return 'end';
    }

    if (params.target === 'waypoint') {
      return 'waypoint';
    }

    return 'start';
  }, [params.target]);

  const waypointIndex = useMemo(() => {
    const index = Number(params.waypointIndex);
    return Number.isInteger(index) && index >= 0 ? index : 0;
  }, [params.waypointIndex]);

  const targetLabel = target === 'start'
    ? '출발지'
    : target === 'end'
      ? '도착지'
      : `경유지 ${waypointIndex + 1}`;

  const loadSavedPlaces = useCallback(async () => {
    if (!accessToken) {
      setSavedPlaces([]);
      return;
    }

    try {
      const response = await getPointBookmarks(accessToken);
      setSavedPlaces(response.items);
    } catch {
      // 검색 기능 자체는 즐겨찾기 조회 실패와 관계없이 사용할 수 있습니다.
      setSavedPlaces([]);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadSavedPlaces();
  }, [loadSavedPlaces]);

  // 화면을 다시 열 때 이전 검색어와 결과를 남기지 않습니다.
  useFocusEffect(
    useCallback(() => {
      setQuery('');
      setResults([]);
      setMessage('');
    }, [target, waypointIndex]),
  );

  const toLocationPoint = (item: PlaceSearchItem): LocationPoint => ({
    name: item.name,
    address: item.roadAddress || item.address,
    lat: item.latitude,
    lng: item.longitude,
  });

  const applyPoint = (point: LocationPoint) => {
    if (target === 'start') {
      updateDraft({ startPoint: point });
    } else if (target === 'end') {
      updateDraft({ endPoint: point });
    } else {
      setWaypointSlot(waypointIndex, point);
    }

    router.back();
  };

  const handleSearch = async () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setMessage('검색할 장소나 주소를 입력해 주세요.');
      setResults([]);
      return;
    }

    if (!accessToken) {
      setMessage('장소 검색은 로그인 후 사용할 수 있어요.');
      return;
    }

    setIsSearching(true);
    setMessage('');

    try {
      const response = await searchPlaces(accessToken, trimmedQuery);
      setResults(response.items);

      if (response.items.length === 0) {
        setMessage('검색 결과가 없어요. 다른 검색어로 다시 시도해 주세요.');
      }
    } catch (error) {
      setResults([]);
      setMessage(getApiErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  };

  const isSaved = (item: PlaceSearchItem) =>
    savedPlaces.some(
      (place) =>
        place.point.latitude === item.latitude &&
        place.point.longitude === item.longitude,
    );

  const handleSave = async (item: PlaceSearchItem) => {
    if (!accessToken) {
      Alert.alert('로그인이 필요해요', '장소 즐겨찾기는 로그인 후 저장할 수 있어요.');
      return;
    }

    if (isSaved(item)) {
      return;
    }

    const itemId = `${item.latitude}:${item.longitude}`;
    setIsSavingId(itemId);

    try {
      const savedPlace = await createPointBookmark(accessToken, {
        name: item.name,
        point: {
          latitude: item.latitude,
          longitude: item.longitude,
        },
      });
      setSavedPlaces((current) => [...current, savedPlace]);
    } catch (error) {
      Alert.alert('저장하지 못했어요', getApiErrorMessage(error));
    } finally {
      setIsSavingId(null);
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
        <View>
          <Text style={styles.title}>{`${targetLabel} 검색`}</Text>
          <Text style={styles.subtitle}>
            {'검색 결과를 선택하면 지도와 코스 설정에 반영됩니다.'}
          </Text>
        </View>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          autoCorrect={false}
          autoFocus
          onChangeText={setQuery}
          onSubmitEditing={() => void handleSearch()}
          placeholder="장소명 또는 주소 입력"
          placeholderTextColor="#8F92B5"
          returnKeyType="search"
          style={styles.textInput}
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityLabel="검색어 지우기"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              setQuery('');
              setResults([]);
              setMessage('');
            }}
            style={({ pressed }) => [
              styles.clearQueryButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.clearQueryText}>{'×'}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={isSearching}
          onPress={() => void handleSearch()}
          style={({ pressed }) => [
            styles.searchButton,
            isSearching && styles.disabled,
            pressed && !isSearching && styles.pressed,
          ]}>
          <Text style={styles.searchButtonText}>{'검색'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {savedPlaces.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{'즐겨찾기 장소'}</Text>
            <Text style={styles.sectionHint}>
              {`아래 장소를 누르면 ${targetLabel}로 바로 지정됩니다.`}
            </Text>
            {savedPlaces.map((place) => (
              <Pressable
                accessibilityRole="button"
                key={place.bookmarkIdx}
                onPress={() =>
                  applyPoint({
                    id: String(place.bookmarkIdx),
                    name: place.name,
                    lat: place.point.latitude,
                    lng: place.point.longitude,
                  })
                }
                style={({ pressed }) => [
                  styles.favoriteRow,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.favoriteStar}>{'★'}</Text>
                <View style={styles.rowCopy}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.coordinateText}>
                    {`${place.point.latitude.toFixed(5)}, ${place.point.longitude.toFixed(5)}`}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          {isSearching ? <ActivityIndicator color="#100078" /> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {!isSearching && !message && results.length === 0 ? (
            <Text style={styles.emptyText}>
              {'장소명이나 주소를 검색해 주세요.'}
            </Text>
          ) : null}

          {results.map((item) => {
            const itemId = `${item.latitude}:${item.longitude}`;
            const saved = isSaved(item);

            return (
              <View key={itemId} style={styles.resultRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => applyPoint(toLocationPoint(item))}
                  style={({ pressed }) => [
                    styles.resultMain,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={styles.placeName}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.addressText}>
                    {item.roadAddress || item.address}
                  </Text>
                  {item.category ? (
                    <Text numberOfLines={1} style={styles.categoryText}>
                      {item.category}
                    </Text>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityLabel={`${item.name} 즐겨찾기 저장`}
                  accessibilityRole="button"
                  disabled={saved || isSavingId === itemId}
                  hitSlop={8}
                  onPress={() => void handleSave(item)}
                  style={({ pressed }) => [
                    styles.saveButton,
                    (saved || isSavingId === itemId) && styles.savedButton,
                    pressed && !saved && styles.pressed,
                  ]}>
                  <Text style={[styles.saveButtonText, saved && styles.savedButtonText]}>
                    {saved ? '★' : '☆'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
