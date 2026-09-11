/** TODO: expo-secure-store 설치 후 토큰 저장, 조회와 삭제를 구현합니다. */
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'runstop_access_token';

export function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export function saveAccessToken(
  accessToken: string,
): Promise<void> {
  return SecureStore.setItemAsync(
    ACCESS_TOKEN_KEY,
    accessToken,
  );
}

export function deleteAccessToken(): Promise<void> {
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
