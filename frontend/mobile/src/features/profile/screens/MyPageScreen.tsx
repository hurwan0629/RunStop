import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import { withdrawCurrentUser } from '../api/profileApi';
import { styles } from './MyPageScreen.styles';

/**
 * 사용자 정보와 러닝 현황, 마이페이지 메뉴를 표시합니다.
 * 현재는 API 연동 전이므로 실제 수치 대신 빈 상태를 보여줍니다.
 */
export default function MyPageScreen() {
  const router = useRouter();
  const { accessToken, user, signOut } = useAuth();
  const [isWithdrawing, setIsWithdrawing] = useState(false);

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
        {
          text: '로그아웃',
          onPress: () => void handleSignOut(),
        },
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <View style={styles.profileImagePlaceholder}>
            <Text style={styles.profileImageText}>MY</Text>
          </View>

          <View style={styles.profileCopy}>
            <Text style={styles.nickname}>
              {user?.nickname ?? '닉네임'}
            </Text>
            <Text style={styles.loginId}>
              {'@아이디는 연동 후 표시'}
            </Text>
            <Text style={styles.levelText}>
              {'레벨 정보는 러닝 기록 연동 후 표시'}
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
          <Text style={styles.expValue}>0 EXP</Text>
        </View>
        <View style={styles.progressTrack} />
        <Text style={styles.progressHelp}>
          {'러닝을 완료하면 경험치가 쌓여요.'}
        </Text>

        <View style={styles.goalCard}>
          <Text style={styles.cardLabel}>{'이번 달 목표'}</Text>
          <Text style={styles.goalEmptyTitle}>
            {'아직 설정한 목표가 없어요'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/profile/goals')}
            style={({ pressed }) => [
              styles.goalButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.goalButtonText}>{'목표 설정'}</Text>
          </Pressable>
        </View>

        <View style={styles.menuCard}>
          <MenuRow
            description="아직 기록이 없어요"
            onPress={() => router.push('/records')}
            title="러닝 기록"
          />
          <MenuRow
            description="저장된 코스가 없어요"
            onPress={() => router.push('/profile/bookmarks')}
            title="즐겨찾기 코스"
          />
          <MenuRow
            description="분석할 러닝 기록이 없어요"
            onPress={() => router.push('/profile/pace-analysis')}
            title="페이스 분석"
          />
          <MenuRow
            description="설정된 목표가 없어요"
            isLast
            onPress={() => router.push('/profile/goals')}
            title="러닝 목표"
          />
        </View>

        <Text style={styles.sectionTitle}>{'설정'}</Text>
        <View style={styles.menuCard}>
          <MenuRow
            onPress={() => router.push('/profile/inquiries')}
            title="문의하기"
          />
          <MenuRow
            onPress={showSignOutConfirmation}
            title="로그아웃"
          />
          <MenuRow
            danger
            disabled={isWithdrawing}
            isLast
            onPress={showWithdrawalConfirmation}
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
};

function MenuRow({
  title,
  description,
  onPress,
  isLast = false,
  danger = false,
  disabled = false,
}: MenuRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuRow,
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
