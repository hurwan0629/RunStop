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

import { useLogin } from '../hooks/useLogin';
import { styles } from './LoginScreen.styles';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, errorMessage } = useLogin();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loginIdError, setLoginIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleLogin = async () => {
    const input = { loginId: loginId.trim(), password };
    const nextLoginIdError = input.loginId ? '' : '아이디를 입력해 주세요.';
    const nextPasswordError = input.password ? '' : '비밀번호를 입력해 주세요.';

    setLoginIdError(nextLoginIdError);
    setPasswordError(nextPasswordError);

    if (nextLoginIdError || nextPasswordError) {
      return;
    }

    if (await login(input)) {
      router.replace('/home');
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>{'R'}</Text>
            </View>
            <Text style={styles.brandName}>{'RunStop'}</Text>
          </View>
          <Text style={styles.subtitle}>
            {'화장실·편의점·경사도·야간 인프라 반영'}
          </Text>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{'아이디'}</Text>
              <TextInput
                accessibilityLabel="아이디"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                onChangeText={(text) => {
                  setLoginId(text);
                  setLoginIdError('');
                }}
                placeholder="아이디를 입력하세요"
                placeholderTextColor="#C8D0DC"
                returnKeyType="next"
                style={[styles.input, loginIdError && styles.inputError]}
                value={loginId}
              />
              {loginIdError ? (
                <Text style={styles.errorText}>{`ⓘ  ${loginIdError}`}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>{'비밀번호'}</Text>
              <View
                style={[
                  styles.passwordRow,
                  passwordError && styles.inputError,
                ]}>
                <TextInput
                  accessibilityLabel="비밀번호"
                  editable={!isLoading}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  onSubmitEditing={() => void handleLogin()}
                  placeholder="비밀번호를 입력하세요"
                  placeholderTextColor="#C8D0DC"
                  returnKeyType="done"
                  secureTextEntry={!isPasswordVisible}
                  style={styles.passwordInput}
                  value={password}
                />
                <Pressable
                  accessibilityLabel={
                    isPasswordVisible ? '비밀번호 숨기기' : '비밀번호 표시'
                  }
                  accessibilityRole="button"
                  hitSlop={10}
                  onPress={() =>
                    setIsPasswordVisible((visible) => !visible)
                  }
                  style={styles.visibilityButton}>
                  <EyeIcon active={isPasswordVisible} />
                </Pressable>
              </View>
              {passwordError ? (
                <Text style={styles.errorText}>{`ⓘ  ${passwordError}`}</Text>
              ) : null}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isLoading}
              onPress={() => void handleLogin()}
              style={({ pressed }) => [
                styles.loginButton,
                isLoading && styles.disabledButton,
                pressed && !isLoading && styles.pressed,
              ]}>
              <Text style={styles.loginButtonText}>
                {isLoading ? '로그인 중...' : '로그인'}
              </Text>
            </Pressable>
            {errorMessage ? (
              <Text style={styles.serverErrorText}>{`ⓘ  ${errorMessage}`}</Text>
            ) : null}
          </View>

          <View style={styles.links}>
            <Pressable onPress={() => router.push('/signup')}>
              <Text style={[styles.linkText, styles.primaryLinkText]}>
                {'회원가입'}
              </Text>
            </Pressable>
            <Text style={styles.linkDivider}>{'|'}</Text>
            <Pressable onPress={() => router.push('/find-id')}>
              <Text style={styles.linkText}>{'아이디 찾기'}</Text>
            </Pressable>
            <Text style={styles.linkDivider}>{'|'}</Text>
            <Pressable onPress={() => router.push('/reset-password')}>
              <Text style={styles.linkText}>{'비밀번호 찾기'}</Text>
            </Pressable>
          </View>
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
