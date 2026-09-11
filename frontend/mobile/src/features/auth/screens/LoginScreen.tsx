import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Button,
  Pressable,
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
    const input = {
      loginId: loginId.trim(),
      password,
    };

    const nextLoginIdError = input.loginId
      ? ''
      : '아이디를 입력해 주세요.';

    const nextPasswordError = input.password
      ? ''
      : '비밀번호를 입력해 주세요.';

    setLoginIdError(nextLoginIdError);
    setPasswordError(nextPasswordError);

    if (nextLoginIdError || nextPasswordError) {
      return;
    }

    const success = await login(input);

    if (success) {
      router.replace('/home');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>RunStop</Text>

        <Text style={styles.subtitle}>
          화장실·편의점·경사도·야간 인프라 반영
        </Text>

        <Text style={styles.label}>아이디</Text>

        <TextInput
          accessibilityLabel="아이디"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
          onChangeText={(text) => {
            setLoginId(text);
            setLoginIdError('');
          }}
          placeholder="아이디를 입력해 주세요"
          returnKeyType="next"
          style={[
            styles.input,
            loginIdError ? styles.inputError : undefined,
          ]}
          value={loginId}
        />

        {loginIdError ? (
          <Text style={styles.errorText}>
            ⓘ {loginIdError}
          </Text>
        ) : null}

        <Text style={styles.label}>비밀번호</Text>

        <View
          style={[
            styles.passwordRow,
            passwordError ? styles.inputError : undefined,
          ]}>
          <TextInput
            accessibilityLabel="비밀번호"
            editable={!isLoading}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordError('');
            }}
            onSubmitEditing={() => void handleLogin()}
            placeholder="비밀번호를 입력해 주세요"
            returnKeyType="done"
            secureTextEntry={!isPasswordVisible}
            style={styles.passwordInput}
            value={password}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setIsPasswordVisible((visible) => !visible)
            }>
            <Text>
              {isPasswordVisible ? '숨기기' : '보기'}
            </Text>
          </Pressable>
        </View>

        {passwordError ? (
          <Text style={styles.errorText}>
            ⓘ {passwordError}
          </Text>
        ) : null}

        <Button
          disabled={isLoading}
          onPress={() => void handleLogin()}
          title={isLoading ? '로그인 중...' : '로그인'}
        />

        {errorMessage ? (
          <Text style={styles.errorText}>
            ⓘ {errorMessage}
          </Text>
        ) : null}

        <View style={styles.links}>
          <Link href="/signup">회원가입</Link>
          <Link href="/find-id">아이디 찾기</Link>
          <Link href="/reset-password">비밀번호 찾기</Link>
        </View>

        {__DEV__ ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/home')}
            style={({ pressed }) => [
              styles.previewButton,
              pressed && styles.previewButtonPressed,
            ]}>
            <Text style={styles.previewButtonText}>
              홈 화면 미리보기 (개발용)
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
