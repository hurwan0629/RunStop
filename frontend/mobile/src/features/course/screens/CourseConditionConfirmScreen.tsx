import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  | 'toiletImportance'
  | 'convenienceImportance'
  | 'nightImportance';

const importanceItems: Array<{
  key: ImportanceKey;
  label: string;
}> = [
  { key: 'distanceImportance', label: '거리' },
  { key: 'slopeImportance', label: '경사도' },
  { key: 'toiletImportance', label: '화장실' },
  { key: 'convenienceImportance', label: '편의점' },
  { key: 'nightImportance', label: '야간 인프라' },
];

const slopeLabels: Record<SlopePreference, string> = {
  GENTLE: '완만',
  NORMAL: '보통',
  ANY: '상관없음',
};

/** 입력한 러닝 조건과 우선순위를 최종 확인하는 3단계 화면입니다. */
export default function CourseConditionConfirmScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useCourseDraft();

  const setImportance = (
    key: ImportanceKey,
    value: ImportanceLevel,
  ) => {
    updateDraft({ [key]: value } as Pick<CourseDraft, ImportanceKey>);
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
        <Text style={styles.noticeText}>
          {
            '현재는 백엔드 연결 전이라 입력한 조건을 앱 안에서 정리해 보여주고 있어요.'
          }
        </Text>

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
            onPress={() => router.push('/course/compare')}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.buttonRowPrimary,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.primaryButtonText}>{'코스 찾기'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
