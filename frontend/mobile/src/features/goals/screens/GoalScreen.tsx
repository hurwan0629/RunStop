import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
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

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { createGoal, getCurrentGoal, stopGoal } from '../api/goalsApi';
import type { CurrentGoalResponse, GoalType } from '../types';
import { styles } from './GoalScreen.styles';

const quickDistances: Record<GoalType, number[]> = {
  WEEKLY: [20, 30, 50],
  MONTHLY: [60, 100, 150],
};

export default function GoalScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [goalType, setGoalType] = useState<GoalType>('MONTHLY');
  const [distanceKm, setDistanceKm] = useState('60');
  const [currentGoal, setCurrentGoal] =
    useState<CurrentGoalResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCurrentGoal = useCallback(async () => {
    if (!accessToken) {
      setCurrentGoal(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      setCurrentGoal(await getCurrentGoal(accessToken));
    } catch (error) {
      setLoadError(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadCurrentGoal();
  }, [loadCurrentGoal]);

  const selectGoalType = (nextType: GoalType) => {
    setGoalType(nextType);
    setDistanceKm(String(quickDistances[nextType][0]));
    setFormError('');
    setNotice('');
  };

  const handleSave = async () => {
    const parsedDistance = Number(distanceKm.replace(',', '.'));

    setFormError('');
    setNotice('');

    if (!Number.isFinite(parsedDistance) || parsedDistance <= 0) {
      setFormError('0보다 큰 목표 거리를 입력해 주세요.');
      return;
    }

    if (!accessToken) {
      setFormError('로그인 후 러닝 목표를 저장할 수 있어요.');
      return;
    }

    const period = createGoalPeriod(goalType);
    setIsSaving(true);

    try {
      await createGoal(accessToken, {
        goalType,
        targetDistance: Math.round(parsedDistance * 1000),
        ...period,
      });
      setNotice('러닝 목표가 저장되었습니다.');
      await loadCurrentGoal();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const activeGoal = currentGoal?.goal ?? null;

  const handleStopGoal = async () => {
    if (!accessToken || !activeGoal || isSaving) {
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      await stopGoal(accessToken, activeGoal.idx);
      setNotice('러닝 목표를 종료했습니다.');
      await loadCurrentGoal();
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmStopGoal = () => {
    Alert.alert('목표를 종료할까요?', '종료 후에는 새로운 목표를 만들 수 있어요.', [
      { text: '취소', style: 'cancel' },
      { text: '목표 종료', style: 'destructive', onPress: () => void handleStopGoal() },
    ]);
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
        <Text style={styles.screenTitle}>{'러닝 목표'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ActivityIndicator color="#100078" style={styles.loader} />
        ) : null}

        {loadError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadCurrentGoal()}>
              <Text style={styles.retryText}>{'다시 불러오기'}</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && activeGoal ? (
          <CurrentGoalCard
            distance={currentGoal?.progress.distance ?? 0}
            endDate={activeGoal.endDate}
            goalType={activeGoal.goalType}
            rate={currentGoal?.progress.rate ?? 0}
            targetDistance={activeGoal.targetDistance}
            isStopping={isSaving}
            onStop={confirmStopGoal}
          />
        ) : null}

        {!isLoading && !activeGoal ? (
          <>
            <Text style={styles.sectionLabel}>{'목표 유형'}</Text>
            <View style={styles.typeRow}>
              <GoalTypeButton
                active={goalType === 'WEEKLY'}
                label="주간 목표"
                onPress={() => selectGoalType('WEEKLY')}
              />
              <GoalTypeButton
                active={goalType === 'MONTHLY'}
                label="월간 목표"
                onPress={() => selectGoalType('MONTHLY')}
              />
            </View>

            <Text style={styles.distanceLabel}>
              {goalType === 'WEEKLY' ? '주간 목표 거리' : '월간 목표 거리'}
            </Text>
            <View style={styles.distanceInputRow}>
              <TextInput
                keyboardType="decimal-pad"
                maxLength={6}
                onChangeText={(value) => {
                  setDistanceKm(value);
                  setFormError('');
                  setNotice('');
                }}
                selectTextOnFocus
                style={styles.distanceInput}
                value={distanceKm}
              />
              <Text style={styles.distanceUnit}>{'km'}</Text>
            </View>

            <Text style={styles.quickLabel}>{'빠른 선택'}</Text>
            <View style={styles.quickRow}>
              {quickDistances[goalType].map((distance) => (
                <Pressable
                  accessibilityRole="button"
                  key={distance}
                  onPress={() => {
                    setDistanceKm(String(distance));
                    setFormError('');
                    setNotice('');
                  }}
                  style={[
                    styles.quickButton,
                    Number(distanceKm) === distance && styles.quickButtonActive,
                  ]}>
                  <Text
                    style={[
                      styles.quickButtonText,
                      Number(distanceKm) === distance && styles.quickButtonTextActive,
                    ]}>
                    {`${distance}km`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.periodHelp}>
              {goalType === 'WEEKLY'
                ? '저장일부터 7일 동안의 목표로 설정돼요.'
                : '저장일부터 30일 동안의 목표로 설정돼요.'}
            </Text>

            {formError ? (
              <Text style={styles.formError}>{formError}</Text>
            ) : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={() => void handleSave()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.pressed,
                isSaving && styles.disabled,
              ]}>
              {isSaving ? (
                <ActivityIndicator color="#C8FF30" />
              ) : (
                <Text style={styles.primaryButtonText}>{'목표 저장하기'}</Text>
              )}
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function GoalTypeButton({
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
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.typeButton, active && styles.typeButtonActive]}>
      <Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function CurrentGoalCard({
  distance,
  endDate,
  goalType,
  rate,
  targetDistance,
  isStopping,
  onStop,
}: {
  distance: number;
  endDate: string;
  goalType: GoalType;
  rate: number;
  targetDistance: number;
  isStopping: boolean;
  onStop: () => void;
}) {
  const safeRate = Math.max(0, Math.min(100, rate));

  return (
    <View style={styles.currentCard}>
      <Text style={styles.currentEyebrow}>{'현재 진행 중인 목표'}</Text>
      <View style={styles.currentTitleRow}>
        <Text style={styles.currentTitle}>
          {goalType === 'WEEKLY' ? '주간 목표' : '월간 목표'}
        </Text>
        <Text style={styles.currentRate}>{`${safeRate}%`}</Text>
      </View>
      <Text style={styles.currentDistance}>
        {`${metersToKilometers(distance)} / ${metersToKilometers(targetDistance)} km`}
      </Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${safeRate}%` }]} />
      </View>
      <Text style={styles.currentHelp}>{`${formatSimpleDate(endDate)}까지 진행되는 목표예요.`}</Text>
      <Text style={styles.currentFootnote}>
        {'진행 중인 목표를 마친 뒤 새 목표를 설정할 수 있어요.'}
      </Text>
      <Pressable
        disabled={isStopping}
        onPress={onStop}
        style={({ pressed }) => [
          styles.stopButton,
          pressed && styles.pressed,
          isStopping && styles.disabled,
        ]}>
        {isStopping ? (
          <ActivityIndicator color="#D33D34" />
        ) : (
          <Text style={styles.stopButtonText}>{'현재 목표 종료'}</Text>
        )}
      </Pressable>
    </View>
  );
}

function createGoalPeriod(goalType: GoalType) {
  const start = new Date();
  const end = new Date(start);

  // Figma에 날짜 선택이 없어서 현재는 저장일 기준 7일/30일로 전송합니다.
  end.setDate(end.getDate() + (goalType === 'WEEKLY' ? 6 : 29));

  return {
    startDate: toLocalDateString(start),
    endDate: toLocalDateString(end),
  };
}

function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function metersToKilometers(distance: number) {
  return Number((distance / 1000).toFixed(1));
}

function formatSimpleDate(value: string) {
  return value.slice(0, 10).replace(/-/g, '.');
}
