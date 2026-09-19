import { useEffect, useRef, useState } from 'react';
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
import { getRecommendationFailure, type RecommendationFailure } from '@/services/api/errors';

import { recommendCourses } from '../api/courseApi';
import { RecommendationFeedback } from '../components/RecommendationFeedback';
import { useCourseDraft } from '../context/CourseDraftContext';
import type {
  CourseDraft,
  SlopePreference,
} from '../types';
import { ImportanceSelector } from './CourseConditionsScreen';
import { courseFlowStyles as styles } from './CourseFlow.styles';

const slopeLabels: Record<SlopePreference, string> = {
  GENTLE: '완만',
  NORMAL: '약간 경사짐',
  ANY: '상관없음',
};
// 경사도 기준과 적용
const maxSlopeByPreference: Record<SlopePreference, number | undefined> = {
  GENTLE: 5,
  NORMAL: 8,
  ANY: undefined,
};

/** 입력한 러닝 조건과 우선순위를 최종 확인하는 3단계 화면입니다. */
export default function CourseConditionConfirmScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const { draft, setRecommendationResult, updateDraft } = useCourseDraft();
  const [isLoading, setIsLoading] = useState(false);
  const [failure, setFailure] = useState<RecommendationFailure | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  // 대기 취소는 응답 수신을 중단한다. 늦게 도착한 결과로 화면을 이동하지 않는다.
  const closeFeedback = () => {
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    setIsLoading(false);
    setFailure(null);
  };

  const handleRecommend = async () => {
    if (pendingRequest.current) return;
    setFailure(null);

    if (!accessToken) {
      setFailure({ title: '로그인이 필요해요', message: '로그인 후 코스를 추천받을 수 있어요.', action: 'login' });
      return;
    }
    if (!draft.startPoint) {
      setFailure({ title: '출발지가 없어요', message: '출발지를 먼저 설정해 주세요.', action: 'edit' });
      return;
    }
    if (!Number.isFinite(draft.targetDistanceKm) || draft.targetDistanceKm <= 0) {
      setFailure({ title: '거리를 확인해 주세요', message: '0보다 큰 목표 거리를 입력해 주세요.', action: 'edit' });
      return;
    }

    setIsLoading(true);
    const controller = new AbortController();
    pendingRequest.current = controller;

    try {
      const result = await recommendCourses(accessToken, {
        prompt: draft.prompt.trim() || undefined,
        routeType: draft.endPoint ? 'ONE_WAY' : 'LOOP',
        startPoint: toCoordinate(draft.startPoint),
        waypoints: draft.waypoints.map(toCoordinate),
        endPoint: draft.endPoint ? toCoordinate(draft.endPoint) : undefined,
        elementConditions: {
          targetDistance: Math.round(draft.targetDistanceKm * 1000),
          maxSlope: maxSlopeByPreference[draft.slopePreference],
          slopePreference: draft.slopePreference,
          preferNature: draft.preferNature,
          preferFlow: draft.preferFlow,
          facilityPreferences: {
            toilet: draft.facilities.includes('TOILET') ? 'PREFER' : 'IGNORE',
            store: draft.facilities.includes('CONVENIENCE_STORE')
              ? 'PREFER'
              : 'IGNORE',
          },
          weights: {
            night: draft.nightImportance,
          },
          // 시설의 체크 여부는 facilityPreferences에서만 판단합니다.
          // requirements에 true를 넣으면 시설이 없는 fallback 후보도 제외될 수 있어요.
          requirements: {},
        },
      }, controller.signal);

      if (controller.signal.aborted) return;
      if (result.recommendations.length === 0) {
        setFailure({
          title: '추천 결과가 없어요',
          message: '요청한 위치와 조건으로 코스를 찾지 못했어요. 위치나 목표 거리를 조정해 보세요.',
          action: 'edit',
        });
        return;
      }
      setRecommendationResult(result);
      router.push('/course/compare');
    } catch (error) {
      if (!controller.signal.aborted) setFailure(getRecommendationFailure(error));
    } finally {
      if (pendingRequest.current === controller) {
        pendingRequest.current = null;
        setIsLoading(false);
      }
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
          <Text style={styles.completeBadgeText}>{'✓ 러닝 조건 확인'}</Text>
        </View>
        <Text style={[styles.introTitle, { marginTop: 14 }]}>
          {'이 조건으로 찾아볼까요?'}
        </Text>
        <Text style={styles.introText}>
          {'선택한 조건을 반영해 코스 후보를 만들어요.'}
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
          <SummaryRow label="공원·하천" value={draft.preferNature ? '선호' : '상관없음'} />
          <SummaryRow label="신호등·횡단보도 적게" value={draft.preferFlow ? '선호' : '상관없음'} />
        </View>

        <View style={styles.importanceSection}>
          <Text style={styles.sectionTitle}>{'시설 선호'}</Text>
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
              onChange={(nightImportance) => updateDraft({ nightImportance })}
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
      <RecommendationFeedback
        loading={isLoading}
        failure={failure}
        onClose={closeFeedback}
        onAction={() => {
          const action = failure?.action;
          setFailure(null);
          if (action === 'retry') void handleRecommend();
          else if (action === 'login') router.push('/login');
          else router.back();
        }}
      />
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
