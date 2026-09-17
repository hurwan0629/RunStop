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
