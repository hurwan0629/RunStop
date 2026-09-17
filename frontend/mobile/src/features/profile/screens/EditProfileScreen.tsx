import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import {
  getMyPageSummary,
  updateCurrentUser,
} from '../api/profileApi';
import { styles } from './EditProfileScreen.styles';

export default function EditProfileScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [nickname, setNickname] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage('로그인 후 정보를 수정할 수 있어요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const summary = await getMyPageSummary(accessToken);
      setNickname(summary.user.nickname);
      setHeightCm(summary.profile?.heightCm?.toString() ?? '');
      setWeightKg(summary.profile?.weightKg?.toString() ?? '');
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!accessToken) {
      setErrorMessage('로그인이 필요합니다.');
      return;
    }

    const trimmedNickname = nickname.trim();
    const parsedHeight = heightCm ? Number(heightCm) : undefined;
    const parsedWeight = weightKg ? Number(weightKg) : undefined;

    if (!trimmedNickname) {
      setErrorMessage('닉네임을 입력해 주세요.');
      return;
    }
    if (parsedHeight !== undefined && (!Number.isFinite(parsedHeight) || parsedHeight <= 0)) {
      setErrorMessage('키를 올바르게 입력해 주세요.');
      return;
    }
    if (parsedWeight !== undefined && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      setErrorMessage('몸무게를 올바르게 입력해 주세요.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      await updateCurrentUser(accessToken, {
        nickname: trimmedNickname,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
      });
      router.back();
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={styles.backButton}>{'‹'}</Text>
          </Pressable>
          <Text style={styles.screenTitle}>{'내 정보 수정'}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          {isLoading ? <ActivityIndicator color="#100078" /> : null}
          <Field
            label="닉네임"
            onChangeText={setNickname}
            placeholder="닉네임"
            value={nickname}
          />
          <Field
            keyboardType="decimal-pad"
            label="키"
            onChangeText={setHeightCm}
            placeholder="예: 170"
            suffix="cm"
            value={heightCm}
          />
          <Field
            keyboardType="decimal-pad"
            label="몸무게"
            onChangeText={setWeightKg}
            placeholder="예: 65"
            suffix="kg"
            value={weightKg}
          />

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <Pressable
            disabled={isLoading || isSaving}
            onPress={() => void handleSave()}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              (isLoading || isSaving) && styles.disabled,
            ]}>
            {isSaving ? (
              <ActivityIndicator color="#C8FF30" />
            ) : (
              <Text style={styles.saveButtonText}>{'저장하기'}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  keyboardType,
  label,
  onChangeText,
  placeholder,
  suffix,
  value,
}: {
  keyboardType?: 'default' | 'decimal-pad';
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  suffix?: string;
  value: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A1A7B3"
          style={styles.input}
          value={value}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}
