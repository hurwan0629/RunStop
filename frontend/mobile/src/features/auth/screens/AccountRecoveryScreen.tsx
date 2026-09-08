import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getApiErrorMessage } from '@/services/api/errors';

import {
  resetPassword,
  sendFindIdPhoneVerification,
  sendPasswordResetPhoneVerification,
  verifyFindIdPhoneCode,
  verifyPasswordResetPhoneCode,
} from '../api/authApi';
import { styles } from './AccountRecoveryScreen.styles';

export type AccountRecoveryMode = 'find-id' | 'reset-password';

interface AccountRecoveryScreenProps {
  mode: AccountRecoveryMode;
}

type PendingAction =
  | 'sendFindIdCode'
  | 'verifyFindIdCode'
  | 'sendResetCode'
  | 'verifyResetCode'
  | 'resetPassword'
  | null;

const PASSWORD_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,100}$/;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function Feedback({
  message,
  success = false,
}: {
  message?: string;
  success?: boolean;
}) {
  if (!message) {
    return null;
  }

  return (
    <Text
      accessibilityLiveRegion="polite"
      style={success ? styles.successText : styles.errorText}>
      {success ? '✓' : 'ⓘ'} {message}
    </Text>
  );
}

export function AccountRecoveryScreen({
  mode,
}: AccountRecoveryScreenProps) {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [foundLoginId, setFoundLoginId] = useState<string | null>(null);

  const [loginId, setLoginId] = useState('');
  const [isResetPhoneVerified, setIsResetPhoneVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isResetComplete, setIsResetComplete] = useState(false);

  const [phoneError, setPhoneError] = useState('');
  const [verificationCodeError, setVerificationCodeError] = useState('');
  const [loginIdError, setLoginIdError] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [newPasswordConfirmError, setNewPasswordConfirmError] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const isBusy = pendingAction !== null;

  const goToLogin = () => {
    router.replace('/login');
  };

  const changeMode = (nextMode: AccountRecoveryMode) => {
    if (nextMode === mode) {
      return;
    }

    router.replace(
      nextMode === 'find-id' ? '/find-id' : '/reset-password',
    );
  };

  const resetVerificationState = () => {
    setVerificationId(null);
    setVerificationCode('');
    setVerificationCodeError('');
    setNotice(null);
    setFormError(null);
  };

  const handleSendFindIdCode = async () => {
    const normalizedPhone = onlyDigits(phone);

    if (normalizedPhone.length < 10 || normalizedPhone.length > 20) {
      setPhoneError('전화번호를 정확하게 입력해 주세요.');
      return;
    }

    setPendingAction('sendFindIdCode');
    setPhoneError('');
    setFormError(null);
    setNotice(null);

    try {
      const result = await sendFindIdPhoneVerification({
        phone: normalizedPhone,
      });

      setVerificationId(result.verificationId);
      setVerificationCode('');
      setFoundLoginId(null);
      setNotice(
        `인증번호를 발송했습니다. ${result.expiresInSec / 60}분 안에 입력해 주세요.`,
      );
    } catch (error) {
      setVerificationId(null);
      setPhoneError(getApiErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleVerifyFindIdCode = async () => {
    if (!verificationId) {
      setPhoneError('먼저 인증번호를 요청해 주세요.');
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setVerificationCodeError('6자리 인증번호를 입력해 주세요.');
      return;
    }

    setPendingAction('verifyFindIdCode');
    setVerificationCodeError('');
    setFormError(null);

    try {
      const result = await verifyFindIdPhoneCode({
        verificationId,
        code: verificationCode,
      });

      setFoundLoginId(result.loginId);
      setNotice(null);
    } catch (error) {
      setFoundLoginId(null);
      setVerificationCodeError(getApiErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleSendResetCode = async () => {
    const trimmedLoginId = loginId.trim();
    const normalizedPhone = onlyDigits(phone);
    let hasError = false;

    if (trimmedLoginId.length < 4 || trimmedLoginId.length > 50) {
      setLoginIdError('아이디는 4자 이상 50자 이하로 입력해 주세요.');
      hasError = true;
    } else {
      setLoginIdError('');
    }

    if (normalizedPhone.length < 10 || normalizedPhone.length > 20) {
      setPhoneError('전화번호를 정확하게 입력해 주세요.');
      hasError = true;
    } else {
      setPhoneError('');
    }

    if (hasError) {
      return;
    }

    setPendingAction('sendResetCode');
    setPhoneError('');
    setFormError(null);
    setNotice(null);

    try {
      const result = await sendPasswordResetPhoneVerification({
        loginId: trimmedLoginId,
        phone: normalizedPhone,
      });

      setVerificationId(result.verificationId);
      setVerificationCode('');
      setIsResetPhoneVerified(false);
      setNotice(
        `인증번호를 발송했습니다. ${result.expiresInSec / 60}분 안에 입력해 주세요.`,
      );
    } catch (error) {
      setVerificationId(null);
      setFormError(getApiErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleVerifyResetCode = async () => {
    if (!verificationId) {
      setPhoneError('먼저 인증번호를 요청해 주세요.');
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setVerificationCodeError('6자리 인증번호를 입력해 주세요.');
      return;
    }

    setPendingAction('verifyResetCode');
    setVerificationCodeError('');
    setFormError(null);

    try {
      await verifyPasswordResetPhoneCode({
        verificationId,
        code: verificationCode,
      });

      setIsResetPhoneVerified(true);
      setNotice(null);
    } catch (error) {
      setIsResetPhoneVerified(false);
      setVerificationCodeError(getApiErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const handleResetPassword = async () => {
    if (!verificationId || !isResetPhoneVerified) {
      setVerificationCodeError('전화번호 인증을 먼저 완료해 주세요.');
      return;
    }

    let hasError = false;

    if (!PASSWORD_PATTERN.test(newPassword)) {
      setNewPasswordError(
        '영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.',
      );
      hasError = true;
    } else {
      setNewPasswordError('');
    }

    if (!newPasswordConfirm) {
      setNewPasswordConfirmError('비밀번호를 한 번 더 입력해 주세요.');
      hasError = true;
    } else if (newPassword !== newPasswordConfirm) {
      setNewPasswordConfirmError('비밀번호가 일치하지 않습니다.');
      hasError = true;
    } else {
      setNewPasswordConfirmError('');
    }

    if (hasError) {
      return;
    }

    setPendingAction('resetPassword');
    setFormError(null);

    try {
      await resetPassword({
        verificationId,
        newPassword,
      });

      setIsResetComplete(true);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const renderVerificationCode = (
    onVerify: () => Promise<void>,
    isVerified: boolean,
  ) => {
    if (!verificationId) {
      return null;
    }

    return (
      <>
        <Text style={styles.label}>인증번호</Text>
        <View style={styles.row}>
          <TextInput
            editable={!isBusy && !isVerified}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(text) => {
              setVerificationCode(onlyDigits(text));
              setVerificationCodeError('');
              setFormError(null);
            }}
            placeholder="6자리 인증번호"
            style={[
              styles.rowInput,
              verificationCodeError ? styles.inputError : undefined,
            ]}
            value={verificationCode}
          />
          <Pressable
            accessibilityRole="button"
            disabled={isBusy || isVerified}
            onPress={() => void onVerify()}
            style={styles.smallButton}>
            <Text style={styles.smallButtonText}>
              {pendingAction === 'verifyFindIdCode' ||
              pendingAction === 'verifyResetCode'
                ? '확인 중'
                : '확인'}
            </Text>
          </Pressable>
        </View>
        <Feedback message={verificationCodeError} />
        <Feedback message={isVerified ? '인증 완료' : undefined} success />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable
              accessibilityLabel="뒤로 가기"
              accessibilityRole="button"
              disabled={isBusy}
              hitSlop={12}
              onPress={() => router.back()}>
              <Text style={styles.backButton}>‹</Text>
            </Pressable>
            <Text style={styles.title}>계정 찾기</Text>
          </View>

          <View style={styles.tabs}>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'find-id' }}
              disabled={isBusy}
              onPress={() => changeMode('find-id')}
              style={[
                styles.tab,
                mode === 'find-id' ? styles.activeTab : undefined,
              ]}>
              <Text
                style={[
                  styles.tabText,
                  mode === 'find-id' ? styles.activeTabText : undefined,
                ]}>
                아이디 찾기
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === 'reset-password' }}
              disabled={isBusy}
              onPress={() => changeMode('reset-password')}
              style={[
                styles.tab,
                mode === 'reset-password' ? styles.activeTab : undefined,
              ]}>
              <Text
                style={[
                  styles.tabText,
                  mode === 'reset-password'
                    ? styles.activeTabText
                    : undefined,
                ]}>
                비밀번호 찾기
              </Text>
            </Pressable>
          </View>

          {mode === 'find-id' ? (
            <View style={styles.form}>
              <Text style={styles.description}>
                가입 시 등록한 전화번호로 인증하면 아이디를 확인할 수
                있어요.
              </Text>

              <Text style={styles.label}>전화번호</Text>
              <View style={styles.row}>
                <TextInput
                  editable={!isBusy && !foundLoginId}
                  keyboardType="phone-pad"
                  maxLength={20}
                  onChangeText={(text) => {
                    setPhone(text);
                    setPhoneError('');
                    setFoundLoginId(null);
                    resetVerificationState();
                  }}
                  placeholder="010-0000-0000"
                  style={[
                    styles.rowInput,
                    phoneError ? styles.inputError : undefined,
                  ]}
                  value={phone}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy || Boolean(foundLoginId)}
                  onPress={() => void handleSendFindIdCode()}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>
                    {pendingAction === 'sendFindIdCode'
                      ? '발송 중'
                      : verificationId
                        ? '재전송'
                        : '인증 요청'}
                  </Text>
                </Pressable>
              </View>
              <Feedback message={phoneError} />
              <Feedback message={notice ?? undefined} success />

              {renderVerificationCode(
                handleVerifyFindIdCode,
                Boolean(foundLoginId),
              )}

              {foundLoginId ? (
                <View style={styles.resultBox}>
                  <Text style={styles.resultLabel}>가입된 아이디</Text>
                  <Text selectable style={styles.resultValue}>
                    {foundLoginId}
                  </Text>
                </View>
              ) : null}

              <Feedback message={formError ?? undefined} />
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.description}>
                아이디와 가입 시 등록한 전화번호를 확인한 후 인증번호를
                보내드려요.
              </Text>

              <Text style={styles.label}>아이디</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy && !isResetPhoneVerified}
                maxLength={50}
                onChangeText={(text) => {
                  setLoginId(text);
                  setLoginIdError('');
                  setIsResetPhoneVerified(false);
                  setIsResetComplete(false);
                  resetVerificationState();
                }}
                placeholder="가입한 아이디를 입력하세요."
                style={[
                  styles.input,
                  loginIdError ? styles.inputError : undefined,
                ]}
                value={loginId}
              />
              <Feedback message={loginIdError} />

              <Text style={styles.label}>전화번호</Text>
              <View style={styles.row}>
                <TextInput
                  editable={!isBusy && !isResetPhoneVerified}
                  keyboardType="phone-pad"
                  maxLength={20}
                  onChangeText={(text) => {
                    setPhone(text);
                    setPhoneError('');
                    setIsResetPhoneVerified(false);
                    setIsResetComplete(false);
                    resetVerificationState();
                  }}
                  placeholder="010-0000-0000"
                  style={[
                    styles.rowInput,
                    phoneError ? styles.inputError : undefined,
                  ]}
                  value={phone}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy || isResetPhoneVerified}
                  onPress={() => void handleSendResetCode()}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>
                    {pendingAction === 'sendResetCode'
                      ? '확인 중'
                      : verificationId
                        ? '재전송'
                        : '인증 요청'}
                  </Text>
                </Pressable>
              </View>
              <Feedback message={phoneError} />
              <Feedback message={notice ?? undefined} success />

              {renderVerificationCode(
                handleVerifyResetCode,
                isResetPhoneVerified,
              )}

              {isResetPhoneVerified && !isResetComplete ? (
                <>
                  <Text style={styles.label}>새 비밀번호</Text>
                  <View
                    style={[
                      styles.passwordRow,
                      newPasswordError ? styles.inputError : undefined,
                    ]}>
                    <TextInput
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isBusy}
                      maxLength={100}
                      onChangeText={(text) => {
                        setNewPassword(text);
                        setNewPasswordError('');
                      }}
                      placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                      secureTextEntry={!isPasswordVisible}
                      style={styles.passwordInput}
                      value={newPassword}
                    />
                    <Pressable
                      accessibilityLabel="비밀번호 표시"
                      accessibilityRole="button"
                      onPress={() =>
                        setIsPasswordVisible((visible) => !visible)
                      }>
                      <Text style={styles.visibilityButton}>
                        {isPasswordVisible ? '숨기기' : '보기'}
                      </Text>
                    </Pressable>
                  </View>
                  <Feedback message={newPasswordError} />

                  <Text style={styles.label}>비밀번호 확인</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isBusy}
                    maxLength={100}
                    onChangeText={(text) => {
                      setNewPasswordConfirm(text);
                      setNewPasswordConfirmError('');
                    }}
                    placeholder="새 비밀번호를 한 번 더 입력해 주세요."
                    secureTextEntry={!isPasswordVisible}
                    style={[
                      styles.input,
                      newPasswordConfirmError
                        ? styles.inputError
                        : undefined,
                    ]}
                    value={newPasswordConfirm}
                  />
                  <Feedback message={newPasswordConfirmError} />

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy}
                    onPress={() => void handleResetPassword()}
                    style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>
                      {pendingAction === 'resetPassword'
                        ? '재설정 중...'
                        : '비밀번호 재설정 완료'}
                    </Text>
                  </Pressable>
                </>
              ) : null}

              {isResetComplete ? (
                <View style={styles.resultBox}>
                  <Text style={styles.resultLabel}>비밀번호 재설정 완료</Text>
                  <Text style={styles.resultDescription}>
                    새로운 비밀번호로 로그인해 주세요.
                  </Text>
                </View>
              ) : null}

              <Feedback message={formError ?? undefined} />
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={goToLogin}
            style={styles.loginButton}>
            <Text style={styles.loginButtonText}>로그인으로 돌아가기</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
