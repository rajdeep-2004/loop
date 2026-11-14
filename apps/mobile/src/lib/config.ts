import Constants from 'expo-constants';

/**
 * Base URL of the API. Set EXPO_PUBLIC_API_URL to override. Without it, the app
 * assumes the API runs on the same computer as the Expo dev server, port 4000,
 * which is the normal setup when testing on a phone over Wi-Fi.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${devHost ?? 'localhost'}:4000`;
}

export const API_URL = resolveApiUrl();
export const API_PREFIX = '/api/v1';
export const REQUEST_TIMEOUT_MS = 15000;

/** Turns a server file path such as /api/v1/files/public/x.png into a full URL. */
export const fileUrl = (path: string) => (path.startsWith('http') ? path : `${API_URL}${path}`);
