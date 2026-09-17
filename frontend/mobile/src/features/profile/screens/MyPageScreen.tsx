import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import {
  getMyPageSummary,
  withdrawCurrentUser,
} from '../api/profileApi';
import type { MyPageSummary } from '../types';
import { styles } from './MyPageScreen.styles';

export default function MyPageScreen() {
  const router = useRouter();
  const { accessToken, user, signOut } = useAuth();
  const [summary, setSummary] = useState<MyPageSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSummary = useCallback(async () => {
    if (!accessToken) {
      setSummary(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      setSummary(await getMyPageSummary(accessToken));
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const showSignOutConfirmation = () => {
    Alert.alert(
      '로그아웃할까요?',
      '다시 로그인하면 기록을 이어볼 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '로그아웃', onPress: () => void handleSignOut() },
      ],
    );
  };

  const handleWithdrawal = async () => {
    if (!accessToken || isWithdrawing) {
      return;
    }

    setIsWithdrawing(true);

    try {
      await withdrawCurrentUser(accessToken);
      await signOut();
      router.replace('/login');
    } catch (error) {
      Alert.alert('탈퇴할 수 없어요', getApiErrorMessage(error));
    } finally {
      setIsWithdrawing(false);
    }
  };

  const showWithdrawalConfirmation = () => {
    if (!accessToken) {
      Alert.alert('로그인이 필요해요', '다시 로그인한 후 이용해 주세요.');
      return;
    }

    Alert.alert(
      '정말 탈퇴하시겠어요?',
      '탈퇴 후에는 계정을 복구하거나 다시 로그인할 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴하기',
          style: 'destructive',
          onPress: () => void handleWithdrawal(),
        },
      ],
    );
  };

  const goalRate = summary?.currentGoal
    ? Math.min(
        100,
        Math.round(
          (summary.currentGoal.progressDistance /
            summary.currentGoal.targetDistance) *
            100,
        ),
      )
    : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {isLoading ? <ActivityIndicator color="#100078" /> : null}
        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Pressable onPress={() => void loadSummary()}>
              <Text style={styles.retryText}>{'다시 불러오기'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.profileRow}>
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>MY</Text>
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.nickname}>
              {summary?.user.nickname ?? user?.nickname ?? '닉네임'}
            </Text>
            <Text style={styles.loginId}>
              {summary ? `@${summary.user.loginId}` : '@아이디'}
            </Text>
            <Text style={styles.levelText}>
              {summary
                ? `누적 ${summary.user.totalExp} EXP`
                : '러닝을 완료하면 경험치가 쌓여요.'}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => router.push('/profile/edit')}>
            <Text style={styles.editText}>{'수정'}</Text>
          </Pressable>
        </View>

        <View style={styles.expHeader}>
          <Text style={styles.expLabel}>{'경험치'}</Text>
          <Text style={styles.expValue}>
            {`${summary?.user.totalExp ?? 0} EXP`}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, (summary?.user.totalExp ?? 0) % 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressHelp}>
          {'러닝을 완료하면 경험치가 쌓여요.'}
        </Text>

        <Pressable
          accessibilityLabel="러닝 목표 확인 또는 설정"
          accessibilityRole="button"
          onPress={() => router.push('/profile/goals')}
          style={({ pressed }) => [
            styles.goalCard,
            pressed && styles.pressed,
          ]}>
          <View style={styles.goalHeader}>
            <Text style={styles.cardLabel}>
              {summary?.currentGoal?.goalType === 'WEEKLY'
                ? '이번 주 목표'
                : '이번 달 목표'}
            </Text>
            {summary?.currentGoal ? (
              <Text style={styles.goalRate}>{`${goalRate}%`}</Text>
            ) : null}
          </View>

          {summary?.currentGoal ? (
            <>
              <View style={styles.goalDistanceRow}>
                <Text style={styles.goalDistanceValue}>
                  {metersToKm(summary.currentGoal.progressDistance)}
                </Text>
                <Text style={styles.goalDistanceTarget}>
                  {` / ${metersToKm(summary.currentGoal.targetDistance)}km`}
                </Text>
              </View>
              <View style={styles.goalProgressTrack}>
                <View
                  style={[
                    styles.goalProgressFill,
                    { width: `${goalRate}%` },
                  ]}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.goalEmptyTitle}>아직 설정한 목표가 없어요</Text>
              <Text style={styles.goalEmptyDescription}>
                목표를 정하고 나만의 러닝 페이스를 만들어 보세요.
              </Text>
            </>
          )}
        </Pressable>

        <View style={styles.menuCard}>
          <MenuRow
            description={
              summary
                ? `총 ${summary.runningSummary.totalCount}회 · ${metersToKm(summary.runningSummary.totalDistance)}km`
                : '아직 기록이 없어요'
            }
            onPress={() => router.push('/records')}
            title="러닝 기록"
          />
          <MenuRow
            description={
              summary
                ? `저장한 코스 ${summary.bookmarkSummary.routeBookmarkCount}개`
                : '저장된 코스가 없어요'
            }
            onPress={() => router.push('/profile/bookmarks')}
            title="즐겨찾기 코스"
          />
          <MenuRow
            description={
              summary?.runningSummary.bestPace
                ? `최고 페이스 ${formatPace(summary.runningSummary.bestPace)}`
                : '분석할 러닝 기록이 없어요'
            }
            onPress={() => router.push('/profile/pace-analysis')}
            title="페이스 분석"
          />
          <MenuRow
            description={
              summary?.currentGoal
                ? `목표 달성률 ${goalRate}%`
                : '설정된 목표가 없어요'
            }
            isLast
            onPress={() => router.push('/profile/goals')}
            title="러닝 목표"
          />
        </View>

        <Text style={styles.sectionTitle}>{'설정'}</Text>
        <View style={styles.settingsMenu}>
          <MenuRow
            plain
            onPress={() => router.push('/profile/inquiries')}
            title="문의하기"
          />
          <MenuRow plain onPress={showSignOutConfirmation} title="로그아웃" />
          <MenuRow
            danger
            disabled={isWithdrawing}
            isLast
            onPress={showWithdrawalConfirmation}
            plain
            title={isWithdrawing ? '탈퇴 처리 중...' : '탈퇴하기'}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MenuRowProps = {
  title: string;
  description?: string;
  onPress: () => void;
  isLast?: boolean;
  danger?: boolean;
  disabled?: boolean;
  plain?: boolean;
};

function MenuRow({
  title,
  description,
  onPress,
  isLast = false,
  danger = false,
  disabled = false,
  plain = false,
}: MenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
        plain && styles.settingRow,
        !isLast && styles.menuRowBorder,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View style={styles.menuTextGroup}>
        <Text style={[styles.menuTitle, danger && styles.dangerText]}>
          {title}
        </Text>
        {description ? (
          <Text style={styles.menuDescription}>{description}</Text>
        ) : null}
      </View>
      <Text style={[styles.chevron, danger && styles.dangerText]}>{'›'}</Text>
    </Pressable>
  );
}

function metersToKm(value: number) {
  return Number((value / 1000).toFixed(1));
}

function formatPace(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = String(Math.round(value % 60)).padStart(2, '0');

  return `${minutes}'${seconds}"/km`;
}
