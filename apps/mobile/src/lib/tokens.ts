import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_KEY = 'campus.refreshToken';

let accessToken: string | null = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

/**
 * The refresh token is the only thing kept on the device. On a phone it goes in
 * the encrypted keystore. Web (development only) has no keystore, so it uses localStorage.
 */
export async function loadRefreshToken(): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(REFRESH_KEY) ?? null;
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function saveRefreshToken(token: string | null): Promise<void> {
  if (Platform.OS === 'web') {
    if (token) globalThis.localStorage?.setItem(REFRESH_KEY, token);
    else globalThis.localStorage?.removeItem(REFRESH_KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(REFRESH_KEY, token);
  else await SecureStore.deleteItemAsync(REFRESH_KEY);
}
