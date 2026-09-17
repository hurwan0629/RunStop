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

import { useAuth } from '@/providers/AuthProvider';
import { getApiErrorMessage } from '@/services/api/errors';

import {
  checkLoginId,
  sendSignupPhoneVerification,
  signup,
  verifySignupPhoneCode,
} from '../api/authApi';
import type { SignupProfile } from '../types';
import { styles } from './SignupScreen.styles';

type SignupStep = 1 | 2;

type FieldName =
  | 'nickname'
  | 'loginId'
  | 'password'
  | 'passwordConfirm'
  | 'phone'
  | 'verificationCode'
  | 'weightKg'
  | 'heightCm';

type FieldErrors = Partial<Record<FieldName, string>>;

type PendingAction =
  | 'checkLoginId'
  | 'sendPhone'
  | 'verifyPhone'
  | 'signup'
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

export default function SignupScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [step, setStep] = useState<SignupStep>(1);
  const [nickname, setNickname] = useState('');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoginIdAvailable, setIsLoginIdAvailable] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [phoneNotice, setPhoneNotice] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const isBusy = pendingAction !== null;

  const clearFieldError = (field: FieldName) => {
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
    setFormError(null);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      return;
    }

    router.back();
  };

  const handleCheckLoginId = async () => {
    const trimmedLoginId = loginId.trim();

    if (trimmedLoginId.length < 4 || trimmedLoginId.length > 50) {
      setIsLoginIdAvailable(false);
      setFieldErrors((current) => ({
        ...current,
        loginId: '아이디는 4자 이상 50자 이하로 입력해 주세요.',
      }));
      return;
    }

    setPendingAction('checkLoginId');
    setFormError(null);

    try {
      const result = await checkLoginId({ loginId: trimmedLoginId });

      if (!result.available) {
        setIsLoginIdAvailable(false);
        setFieldErrors((current) => ({
          ...current,
          loginId: '이미 사용 중인 아이디입니다.',
        }));
        return;
      }

      setIsLoginIdAvailable(true);
      setFieldErrors((current) => ({
        ...current,
        loginId: undefined,
      }));
    } catch (error) {
      setIsLoginIdAvailable(false);
      setFieldErrors((current) => ({
        ...current,
        loginId: getApiErrorMessage(error),
      }));
    } finally {
      setPendingAction(null);
    }
  };

  const handleSendPhoneCode = async () => {
    const normalizedPhone = onlyDigits(phone);

    if (normalizedPhone.length < 10 || normalizedPhone.length > 20) {
      setFieldErrors((current) => ({
        ...current,
        phone: '전화번호를 정확하게 입력해 주세요.',
      }));
      return;
    }

    setPendingAction('sendPhone');
    setFormError(null);
    setPhoneNotice(null);

    try {
      const result = await sendSignupPhoneVerification({
        phone: normalizedPhone,
      });

      setVerificationId(result.verificationId);
      setVerificationCode('');
      setIsPhoneVerified(false);
      setPhoneNotice(
        `인증번호를 발송했습니다. ${result.expiresInSec / 60}분 안에 입력해 주세요.`,
      );
      setFieldErrors((current) => ({
        ...current,
        phone: undefined,
        verificationCode: undefined,
      }));
    } catch (error) {
      setVerificationId(null);
      setIsPhoneVerified(false);
      setFieldErrors((current) => ({
        ...current,
        phone: getApiErrorMessage(error),
      }));
    } finally {
      setPendingAction(null);
    }
  };

  const handleVerifyPhoneCode = async () => {
    if (!verificationId) {
      setFieldErrors((current) => ({
        ...current,
        phone: '먼저 인증번호를 요청해 주세요.',
      }));
      return;
    }

    if (!/^\d{6}$/.test(verificationCode)) {
      setFieldErrors((current) => ({
        ...current,
        verificationCode: '6자리 인증번호를 입력해 주세요.',
      }));
      return;
    }

    setPendingAction('verifyPhone');
    setFormError(null);

    try {
      await verifySignupPhoneCode({
        verificationId,
        code: verificationCode,
      });

      setIsPhoneVerified(true);
      setPhoneNotice(null);
      setFieldErrors((current) => ({
        ...current,
        verificationCode: undefined,
      }));
    } catch (error) {
      setIsPhoneVerified(false);
      setFieldErrors((current) => ({
        ...current,
        verificationCode: getApiErrorMessage(error),
      }));
    } finally {
      setPendingAction(null);
    }
  };

  const handleNext = () => {
    const nextErrors: FieldErrors = {};
    const trimmedNickname = nickname.trim();
    const trimmedLoginId = loginId.trim();
    const normalizedPhone = onlyDigits(phone);

    if (!trimmedNickname) {
      nextErrors.nickname = '닉네임을 입력해 주세요.';
    } else if (trimmedNickname.length > 30) {
      nextErrors.nickname = '닉네임은 30자 이하로 입력해 주세요.';
    }

    if (trimmedLoginId.length < 4 || trimmedLoginId.length > 50) {
      nextErrors.loginId = '아이디는 4자 이상 50자 이하로 입력해 주세요.';
    } else if (!isLoginIdAvailable) {
      nextErrors.loginId = '아이디 중복확인을 완료해 주세요.';
    }

    if (!PASSWORD_PATTERN.test(password)) {
      nextErrors.password =
        '영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.';
    }

    if (!passwordConfirm) {
      nextErrors.passwordConfirm = '비밀번호를 한 번 더 입력해 주세요.';
    } else if (password !== passwordConfirm) {
      nextErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }

    if (normalizedPhone.length < 10 || normalizedPhone.length > 20) {
      nextErrors.phone = '전화번호를 정확하게 입력해 주세요.';
    } else if (!verificationId) {
      nextErrors.phone = '전화번호 인증을 진행해 주세요.';
    } else if (!isPhoneVerified) {
      nextErrors.verificationCode = '인증번호 확인을 완료해 주세요.';
    }

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setStep(2);
  };

  const handleSignup = async () => {
    if (!verificationId || !isPhoneVerified) {
      setStep(1);
      setFieldErrors({
        verificationCode: '전화번호 인증을 다시 완료해 주세요.',
      });
      return;
    }

    const nextErrors: FieldErrors = {};
    const parsedWeight = weightKg.trim() ? Number(weightKg) : undefined;
    const parsedHeight = heightCm.trim() ? Number(heightCm) : undefined;

    if (
      parsedWeight !== undefined &&
      (!Number.isFinite(parsedWeight) || parsedWeight <= 0)
    ) {
      nextErrors.weightKg = '몸무게는 0보다 큰 숫자로 입력해 주세요.';
    }

    if (
      parsedHeight !== undefined &&
      (!Number.isFinite(parsedHeight) || parsedHeight <= 0)
    ) {
      nextErrors.heightCm = '신장은 0보다 큰 숫자로 입력해 주세요.';
    }

    setFieldErrors(nextErrors);
    setFormError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const profile: SignupProfile = {};

    if (parsedWeight !== undefined) {
      profile.weightKg = parsedWeight;
    }

    if (parsedHeight !== undefined) {
      profile.heightCm = parsedHeight;
    }

    setPendingAction('signup');

    try {
      const session = await signup({
        loginId: loginId.trim(),
        password,
        nickname: nickname.trim(),
        phone: onlyDigits(phone),
        verificationId,
        profile:
          Object.keys(profile).length > 0 ? profile : undefined,
      });

      await signIn(session);
      router.replace('/home');
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
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
              onPress={handleBack}>
              <Text style={styles.backButton}>‹</Text>
            </Pressable>

            <Text style={styles.title}>회원가입</Text>
            <View
              accessibilityLabel={`2단계 중 ${step}단계`}
              style={styles.stepIndicator}>
              <View
                style={
                  step === 1
                    ? styles.stepIndicatorActive
                    : styles.stepIndicatorInactive
                }
              />
              <View
                style={
                  step === 2
                    ? styles.stepIndicatorActive
                    : styles.stepIndicatorInactive
                }
              />
            </View>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <Text style={styles.description}>
                기본 계정 정보를 입력해 주세요
              </Text>

              <Text style={styles.label}>닉네임</Text>
              <TextInput
                editable={!isBusy}
                maxLength={30}
                onChangeText={(text) => {
                  setNickname(text);
                  clearFieldError('nickname');
                }}
                placeholder="닉네임을 입력해 주세요."
                placeholderTextColor="#C8D0DC"
                style={[
                  styles.input,
                  fieldErrors.nickname ? styles.inputError : undefined,
                ]}
                value={nickname}
              />
              <Feedback message={fieldErrors.nickname} />

              <Text style={styles.label}>아이디</Text>
              <View style={styles.row}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isBusy}
                  maxLength={50}
                  onChangeText={(text) => {
                    setLoginId(text);
                    setIsLoginIdAvailable(false);
                    clearFieldError('loginId');
                  }}
                  placeholder="아이디를 입력해 주세요."
                  placeholderTextColor="#C8D0DC"
                  style={[
                    styles.rowInput,
                    fieldErrors.loginId ? styles.inputError : undefined,
                  ]}
                  value={loginId}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => void handleCheckLoginId()}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>
                    {pendingAction === 'checkLoginId'
                      ? '확인 중'
                      : '중복확인'}
                  </Text>
                </Pressable>
              </View>
              <Feedback message={fieldErrors.loginId} />
              <Feedback
                message={
                  isLoginIdAvailable
                    ? '사용 가능한 아이디입니다.'
                    : undefined
                }
                success
              />

              <Text style={styles.label}>비밀번호</Text>
              <View
                style={[
                  styles.passwordRow,
                  fieldErrors.password ? styles.inputError : undefined,
                ]}>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isBusy}
                  maxLength={100}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearFieldError('password');
                  }}
                  placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                  placeholderTextColor="#C8D0DC"
                  secureTextEntry={!isPasswordVisible}
                  style={styles.passwordInput}
                  value={password}
                />
                <Pressable
                  accessibilityLabel="비밀번호 표시"
                  accessibilityRole="button"
                  onPress={() =>
                    setIsPasswordVisible((visible) => !visible)
                  }
                  style={styles.visibilityButton}>
                  <EyeIcon active={isPasswordVisible} />
                </Pressable>
              </View>
              <Feedback message={fieldErrors.password} />

              <Text style={styles.label}>비밀번호 확인</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isBusy}
                maxLength={100}
                onChangeText={(text) => {
                  setPasswordConfirm(text);
                  clearFieldError('passwordConfirm');
                }}
                placeholder="비밀번호를 한 번 더 입력해 주세요."
                placeholderTextColor="#C8D0DC"
                secureTextEntry={!isPasswordVisible}
                style={[
                  styles.input,
                  fieldErrors.passwordConfirm
                    ? styles.inputError
                    : undefined,
                ]}
                value={passwordConfirm}
              />
              <Feedback message={fieldErrors.passwordConfirm} />

              <Text style={styles.label}>전화번호</Text>
              <View style={styles.row}>
                <TextInput
                  editable={!isBusy && !isPhoneVerified}
                  keyboardType="phone-pad"
                  maxLength={20}
                  onChangeText={(text) => {
                    setPhone(text);
                    setVerificationId(null);
                    setVerificationCode('');
                    setIsPhoneVerified(false);
                    setPhoneNotice(null);
                    clearFieldError('phone');
                  }}
                  placeholder="010-0000-0000"
                  placeholderTextColor="#C8D0DC"
                  style={[
                    styles.rowInput,
                    fieldErrors.phone ? styles.inputError : undefined,
                  ]}
                  value={phone}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy || isPhoneVerified}
                  onPress={() => void handleSendPhoneCode()}
                  style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>
                    {pendingAction === 'sendPhone'
                      ? '발송 중'
                      : verificationId
                        ? '재전송'
                        : '인증'}
                  </Text>
                </Pressable>
              </View>
              <Feedback message={fieldErrors.phone} />
              <Feedback message={phoneNotice ?? undefined} success />

              {verificationId ? (
                <>
                  <View style={styles.row}>
                    <TextInput
                      editable={!isBusy && !isPhoneVerified}
                      keyboardType="number-pad"
                      maxLength={6}
                      onChangeText={(text) => {
                        setVerificationCode(onlyDigits(text));
                        clearFieldError('verificationCode');
                      }}
                      placeholder="6자리 인증번호"
                      placeholderTextColor="#C8D0DC"
                      style={[
                        styles.rowInput,
                        fieldErrors.verificationCode
                          ? styles.inputError
                          : undefined,
                      ]}
                      value={verificationCode}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={isBusy || isPhoneVerified}
                      onPress={() => void handleVerifyPhoneCode()}
                      style={styles.smallButton}>
                      <Text style={styles.smallButtonText}>
                        {pendingAction === 'verifyPhone'
                          ? '확인 중'
                          : '확인'}
                      </Text>
                    </Pressable>
                  </View>
                  <Feedback message={fieldErrors.verificationCode} />
                  <Feedback
                    message={isPhoneVerified ? '인증 완료' : undefined}
                    success
                  />
                </>
              ) : null}

              <Feedback message={formError ?? undefined} />

              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={handleNext}
                style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>다음 단계</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.description}>
                더 정확한 코스 추천을 위해 신체 정보를 입력해 주세요
              </Text>

              <Text style={styles.label}>몸무게 (KG, 선택)</Text>
              <TextInput
                editable={!isBusy}
                keyboardType="decimal-pad"
                onChangeText={(text) => {
                  setWeightKg(text);
                  clearFieldError('weightKg');
                }}
                placeholder="예: 65"
                placeholderTextColor="#C8D0DC"
                style={[
                  styles.input,
                  fieldErrors.weightKg ? styles.inputError : undefined,
                ]}
                value={weightKg}
              />
              <Feedback message={fieldErrors.weightKg} />

              <Text style={styles.label}>신장 (CM, 선택)</Text>
              <TextInput
                editable={!isBusy}
                keyboardType="decimal-pad"
                onChangeText={(text) => {
                  setHeightCm(text);
                  clearFieldError('heightCm');
                }}
                placeholder="예: 172"
                placeholderTextColor="#C8D0DC"
                style={[
                  styles.input,
                  fieldErrors.heightCm ? styles.inputError : undefined,
                ]}
                value={heightCm}
              />
              <Feedback message={fieldErrors.heightCm} />

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>왜 필요한가요?</Text>
                <Text style={styles.infoText}>
                  몸무게와 신장은 소모 칼로리 계산과 최적 러닝 페이스
                  추정에 활용됩니다. 이후 마이페이지에서 수정할 수 있습니다.
                </Text>
              </View>

              <Feedback message={formError ?? undefined} />

              <View style={styles.footerRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => setStep(1)}
                  style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>이전</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy}
                  onPress={() => void handleSignup()}
                  style={styles.footerPrimaryButton}>
                  <Text style={styles.primaryButtonText}>
                    {pendingAction === 'signup' ? '가입 중...' : '가입 완료'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function EyeIcon({ active }: { active: boolean }) {
  return (
    <View style={[styles.eyeOutline, active && styles.eyeOutlineActive]}>
      <View style={[styles.eyePupil, active && styles.eyePupilActive]} />
    </View>
  );
}
