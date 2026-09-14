import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { recommendCourses } from '../api/courseApi';
import { useCourseDraft } from '../context/CourseDraftContext';
import type {
  CourseDraft,
  ImportanceLevel,
  SlopePreference,
} from '../types';
import { ImportanceSelector } from './CourseConditionsScreen';
import { courseFlowStyles as styles } from './CourseFlow.styles';

type ImportanceKey =
  | 'distanceImportance'
  | 'slopeImportance'
  | 'nightImportance';

const importanceItems: {
  key: ImportanceKey;
  label: string;
}[] = [
    { key: 'distanceImportance', label: '거리' },
    { key: 'slopeImportance', label: '경사도' },
  ];

const slopeLabels: Record<SlopePreference, string> = {
  GENTLE: '완만',
  NORMAL: '보통',
  ANY: '상관없음',
};

/** 입력한 러닝 조건과 우선순위를 최종 확인하는 3단계 화면입니다. */
export default function CourseConditionConfirmScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { draft, setRecommendationResult, updateDraft } = useCourseDraft();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const setImportance = (
    key: ImportanceKey,
    value: ImportanceLevel,
  ) => {
    updateDraft({ [key]: value } as Pick<CourseDraft, ImportanceKey>);
  };

  const handleRecommend = async () => {
    setErrorMessage('');

    if (!accessToken) {
      setErrorMessage('로그인 후 코스를 추천받을 수 있어요.');
      return;
    }
    if (!draft.startPoint) {
      setErrorMessage('출발지를 먼저 설정해 주세요.');
      return;
    }
    if (!Number.isFinite(draft.targetDistanceKm) || draft.targetDistanceKm <= 0) {
      setErrorMessage('0보다 큰 목표 거리를 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await recommendCourses(accessToken, {
        prompt: draft.prompt.trim() || undefined,
        routeType: draft.endPoint ? 'ONE_WAY' : 'LOOP',
        startPoint: toCoordinate(draft.startPoint),
        waypoints: draft.waypoints.map(toCoordinate),
        endPoint: draft.endPoint ? toCoordinate(draft.endPoint) : undefined,
        elementConditions: {
          targetDistance: Math.round(draft.targetDistanceKm * 1000),
          facilityPreferences: {
            toilet: draft.facilities.includes('TOILET') ? 'PREFER' : 'IGNORE',
            store: draft.facilities.includes('CONVENIENCE_STORE')
              ? 'PREFER'
              : 'IGNORE',
          },
          weights: {
            distance: draft.distanceImportance,
            elevation: draft.slopeImportance,
            night: draft.nightImportance,
          },
          // 시설의 체크 여부는 facilityPreferences에서만 판단합니다.
          // requirements에 true를 넣으면 시설이 없는 fallback 후보도 제외될 수 있어요.
          requirements: {},
        },
      });

      setRecommendationResult(result);
      router.push('/course/compare');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
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
        <Text style={styles.screenTitle}>{'조건 확인'}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{'3 / 4'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.completeBadge}>
          <Text style={styles.completeBadgeText}>{'✓ AI 조건 분석 완료'}</Text>
        </View>
        <Text style={[styles.introTitle, { marginTop: 14 }]}>
          {'이 조건으로 찾아볼까요?'}
        </Text>
        <Text style={styles.introText}>
          {'중요도를 조절하면 어떤 조건을 먼저 볼지 정할 수 있어요.'}
        </Text>

        <View style={styles.summaryCard}>
          <SummaryRow
            label="출발지"
            value={draft.startPoint?.name ?? '현재 위치 또는 선택한 장소'}
          />
          <SummaryRow
            label="도착지"
            value={draft.endPoint?.name ?? '미입력 · 순환 코스'}
          />
          <SummaryRow
            label="목표 거리"
            value={`${draft.targetDistanceKm || 0}km`}
          />
          <SummaryRow
            label="러닝 조건"
            value={draft.prompt.trim() || '추가로 입력한 조건 없음'}
          />
          <SummaryRow
            label="경사도"
            value={slopeLabels[draft.slopePreference]}
          />
          <SummaryRow
            label="필요 시설"
            value={formatFacilities(draft)}
          />
        </View>
        {errorMessage ? (
          <Text style={[styles.noticeText, { color: '#E5484D' }]}>
            {errorMessage}
          </Text>
        ) : null}

        <View style={styles.importanceSection}>
          <Text style={styles.sectionTitle}>{'조건별 중요도'}</Text>
          {importanceItems.map((item) => (
            <View key={item.key} style={styles.importanceItem}>
              <View style={styles.importanceLabelRow}>
                <Text style={styles.importanceLabel}>{item.label}</Text>
                <Text style={styles.importanceValue}>
                  {`${draft[item.key]} / 5`}
                </Text>
              </View>
              <ImportanceSelector
                onChange={(value) => setImportance(item.key, value)}
                value={draft[item.key]}
              />
            </View>
          ))}
          <FacilityStatusRow
            label="화장실"
            selected={draft.facilities.includes('TOILET')}
          />
          <FacilityStatusRow
            label="편의점"
            selected={draft.facilities.includes('CONVENIENCE_STORE')}
          />
          <View style={styles.importanceItem}>
            <View style={styles.importanceLabelRow}>
              <Text style={styles.importanceLabel}>{'야간 인프라'}</Text>
              <Text style={styles.importanceValue}>
                {`${draft.nightImportance} / 5`}
              </Text>
            </View>
            <ImportanceSelector
              onChange={(value) => setImportance('nightImportance', value)}
              value={draft.nightImportance}
            />
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.secondaryButtonText}>{'조건 수정'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isLoading}
            onPress={() => void handleRecommend()}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.buttonRowPrimary,
              pressed && styles.pressed,
            ]}>
            {isLoading ? (
              <ActivityIndicator color="#C8FF30" />
            ) : (
              <Text style={styles.primaryButtonText}>{'코스 찾기'}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function toCoordinate(point: { lat: number; lng: number }) {
  return { lat: point.lat, lng: point.lng };
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function FacilityStatusRow({
  label,
  selected,
}: {
  label: string;
  selected: boolean;
}) {
  return (
    <View style={styles.importanceItem}>
      <View style={styles.importanceLabelRow}>
        <Text style={styles.importanceLabel}>{label}</Text>
        <View
          style={[
            styles.facilityStatusBadge,
            selected && styles.facilityStatusBadgeActive,
          ]}>
          {selected ? (
            <Text style={styles.facilityStatusCheck}>{'✓'}</Text>
          ) : null}
          <Text
            style={[
              styles.facilityStatusText,
              selected && styles.facilityStatusTextActive,
            ]}>
            {selected ? '선택함' : '선택 안 함'}
          </Text>
        </View>
      </View>
      <Text style={styles.importanceGuideText}>
        {selected
          ? `${label}이(가) 있는 코스를 우선 추천해요.`
          : `${label} 유무를 코스 추천에 반영하지 않아요.`}
      </Text>
    </View>
  );
}

function formatFacilities(draft: CourseDraft) {
  if (draft.facilities.length === 0) {
    return '선택 안 함';
  }

  return draft.facilities
    .map((facility) =>
      facility === 'TOILET' ? '화장실' : '편의점',
    )
    .join(', ');
}
