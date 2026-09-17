import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useCourseDraft } from '../context/CourseDraftContext';
import type {
  FacilityPreference,
  ImportanceLevel,
  SlopePreference,
} from '../types';
import { courseFlowStyles as styles } from './CourseFlow.styles';

const slopeOptions: {
  label: string;
  description: string;
  value: SlopePreference;
}[] = [
  { label: '완만', description: '경사 최소화', value: 'GENTLE' },
  { label: '보통', description: '일반 코스', value: 'NORMAL' },
  { label: '상관없음', description: '모든 경사', value: 'ANY' },
];

const facilityOptions: {
  label: string;
  value: FacilityPreference;
}[] = [
  { label: '화장실', value: 'TOILET' },
  { label: '편의점', value: 'CONVENIENCE_STORE' },
];

/** 사용자가 원하는 러닝 환경을 입력하는 코스 설정 2단계입니다. */
export default function CourseConditionsScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useCourseDraft();
  const [distanceText, setDistanceText] = useState(
    String(draft.targetDistanceKm),
  );

  const toggleFacility = (facility: FacilityPreference) => {
    const isSelected = draft.facilities.includes(facility);

    updateDraft({
      facilities: isSelected
        ? draft.facilities.filter((item) => item !== facility)
        : [...draft.facilities, facility],
    });
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
        <Text style={styles.screenTitle}>{'러닝 조건'}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>{'2 / 4'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.introTitle}>{'어떤 코스를 원하세요?'}</Text>
        <Text style={styles.introText}>
          {'원하는 조건을 고르면 비교하기 쉬운 코스를 준비할게요.'}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'목표 거리'}</Text>
          <View style={styles.distanceInputRow}>
            <TextInput
              keyboardType="decimal-pad"
              maxLength={6}
              onChangeText={(value) => {
                if (!/^\d*(\.\d*)?$/.test(value)) {
                  return;
                }

                setDistanceText(value);
                const distance = Number(value);
                updateDraft({
                  targetDistanceKm:
                    value && Number.isFinite(distance) ? distance : 0,
                });
              }}
              placeholder="5"
              placeholderTextColor="#A1A7B3"
              style={styles.distanceInput}
              value={distanceText}
            />
            <Text style={styles.distanceUnit}>{'km'}</Text>
          </View>
          <Text style={styles.sectionHelp}>
            {'입력한 거리와 최대한 비슷한 코스를 추천해요.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'원하는 러닝 조건'}</Text>
          <TextInput
            maxLength={300}
            multiline
            onChangeText={(prompt) => updateDraft({ prompt })}
            placeholder="예) 신호등이 적고 조용한 공원길을 달리고 싶어요."
            placeholderTextColor="#A1A7B3"
            style={styles.textArea}
            value={draft.prompt}
          />
          <Text style={styles.characterCount}>{`${draft.prompt.length}/300`}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'경사도'}</Text>
          <View style={styles.optionRow}>
            {slopeOptions.map((option) => {
              const active = draft.slopePreference === option.value;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={option.value}
                  onPress={() =>
                    updateDraft({ slopePreference: option.value })
                  }
                  style={({ pressed }) => [
                    styles.optionButton,
                    active && styles.optionButtonActive,
                    pressed && styles.pressed,
                  ]}>
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}>
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      active && styles.optionDescriptionActive,
                    ]}>
                    {option.description}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'필요한 시설'}</Text>
          <View style={styles.optionRow}>
            {facilityOptions.map((option) => {
              const active = draft.facilities.includes(option.value);

              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  key={option.value}
                  onPress={() => toggleFacility(option.value)}
                  style={({ pressed }) => [
                    styles.facilityButton,
                    active && styles.facilityButtonActive,
                    pressed && styles.pressed,
                  ]}>
                  <View
                    style={[
                      styles.checkCircle,
                      active && styles.checkCircleActive,
                    ]}>
                    {active ? <Text style={styles.checkText}>{'✓'}</Text> : null}
                  </View>
                  <Text
                    style={[
                      styles.optionText,
                      active && styles.optionTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.sectionHelp}>
            {'선택하지 않으면 시설 수를 코스 추천에 반영하지 않아요.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{'야간 인프라 중요도'}</Text>
          <ImportanceSelector
            onChange={(nightImportance) => updateDraft({ nightImportance })}
            value={draft.nightImportance}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/course/confirm')}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}>
          <Text style={styles.primaryButtonText}>{'조건 분석하기'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ImportanceSelector({
  onChange,
  value,
}: {
  onChange: (value: ImportanceLevel) => void;
  value: ImportanceLevel;
}) {
  const levels: ImportanceLevel[] = [1, 2, 3, 4, 5];

  return (
    <>
      <View style={styles.importanceRow}>
        {levels.map((level) => {
          const active = value >= level;

          return (
            <Pressable
              accessibilityLabel={`중요도 ${level}점`}
              accessibilityRole="button"
              accessibilityState={{ selected: value === level }}
              key={level}
              onPress={() => onChange(level)}
              style={({ pressed }) => [
                styles.starButton,
                pressed && styles.pressed,
              ]}>
              <RatingStar active={active} />
            </Pressable>
          );
        })}
      </View>
      <View style={styles.importanceGuide}>
        <Text style={styles.importanceGuideText}>
          {importanceDescription(value)}
        </Text>
      </View>
    </>
  );
}

function RatingStar({ active }: { active: boolean }) {
  return (
    <Svg height={34} viewBox="0 0 24 24" width={34}>
      <Path
        d="M12 2.6l2.88 5.83 6.43.94-4.65 4.53 1.1 6.4L12 17.28 6.24 20.3l1.1-6.4-4.65-4.53 6.43-.94L12 2.6z"
        fill={active ? '#B9FA3C' : '#ECEEF5'}
        stroke={active ? '#04045E' : '#CBD1DC'}
        strokeLinejoin="round"
        strokeWidth={1.45}
      />
    </Svg>
  );
}

function importanceDescription(value: ImportanceLevel) {
  return ['중요하지 않아요', '조금 중요해요', '보통이에요', '중요해요', '매우 중요해요'][
    value - 1
  ];
}
