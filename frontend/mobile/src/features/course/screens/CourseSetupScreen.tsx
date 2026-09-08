
/** 코스 설정 UI를 담당하며, 기획 확정 후 구현합니다. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CourseMap } from '../components/CourseMap';
import { useCourseDraft } from '../context/CourseDraftContext';
import type { LocationPoint } from '../types';
import { styles } from './CourseSetupScreen.styles';

export default function CourseSetupScreen() {
  const router = useRouter();
  const { updateDraft } = useCourseDraft();
  const [currentLocation, setCurrentLocation] =
    useState<LocationPoint | null>(null);

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const loadCurrentLocation = useCallback(async () => {
    if (isLoadingLocation) {
      return;
    }

    setIsLoadingLocation(true);
    setLocationError(null);

    try {
      const isLocationEnabled =
        await Location.hasServicesEnabledAsync();

      if (!isLocationEnabled) {
        throw new Error('기기의 위치 기능을 켜주세요.');
      }

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        throw new Error(
          '현재 위치를 확인하려면 위치 권한이 필요합니다.',
        );
      }

      const result = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const nextLocation: LocationPoint = {
        name: '현재 위치',
        lat: result.coords.latitude,
        lng: result.coords.longitude,
      };

      setCurrentLocation(nextLocation);
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

  useEffect(() => {
    void loadCurrentLocation();
    // 최초 화면 진입 시 한 번만 현재 위치를 요청합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 아직 실제 TMAP 경로가 없으므로 현재 위치 주변에
   * 테스트용 경로선을 만들어 표시합니다.
   */
  const previewRoute = useMemo<LocationPoint[]>(() => {
    if (!currentLocation) {
      return [];
    }

    return [
      currentLocation,
      {
        lat: currentLocation.lat + 0.001,
        lng: currentLocation.lng + 0.001,
      },
      {
        lat: currentLocation.lat + 0.0015,
        lng: currentLocation.lng - 0.0005,
      },
      {
        lat: currentLocation.lat + 0.0003,
        lng: currentLocation.lng - 0.001,
      },
    ];
  }, [currentLocation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.stepText}>{'코스 설정 · 1/4'}</Text>
        <Text style={styles.title}>{'출발지를 확인해 주세요'}</Text>
        <Text style={styles.description}>
          {
            '현재는 GPS와 지도 연결을 확인하는 단계입니다. 장소 검색은 다음 단계에서 추가합니다.'
          }
        </Text>

        <CourseMap
          currentLocation={currentLocation ?? undefined}
          routePath={previewRoute}
          style={styles.map}
        />

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>{'현재 위치 상태'}</Text>

          {locationError ? (
            <Text style={[styles.statusText, styles.errorText]}>
              {locationError}
            </Text>
          ) : (
            <Text style={styles.statusText}>
              {isLoadingLocation
                ? '현재 위치를 불러오는 중입니다...'
                : currentLocation
                  ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}`
                  : '아직 현재 위치가 없습니다.'}
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isLoadingLocation}
          onPress={() => void loadCurrentLocation()}
          style={({ pressed }) => [
            styles.locationButton,
            pressed && styles.pressed,
            isLoadingLocation && styles.disabled,
          ]}>
          <Text style={styles.locationButtonText}>
            {isLoadingLocation
              ? '위치 확인 중...'
              : '현재 위치 다시 불러오기'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/course/conditions')}
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
