import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { useSettingsStore } from '../store/settingsStore';
import { DEFAULT_SERVER_PORT } from '../utils/constants';
import { normalizeServerUrl } from '../utils/validation';

/**
 * Best-effort default for the json-server URL:
 *  1. `EXPO_PUBLIC_API_URL` (inlined at build time - handy for EAS/APK builds);
 *  2. the LAN IP of the machine running the Expo dev server (works on physical devices in Expo Go);
 *  3. the Android emulator host alias, or localhost on iOS simulator / web.
 */
export function getAutoServerUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return normalizeServerUrl(fromEnv);

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:${DEFAULT_SERVER_PORT}`;
  }

  return Platform.OS === 'android'
    ? `http://10.0.2.2:${DEFAULT_SERVER_PORT}`
    : `http://localhost:${DEFAULT_SERVER_PORT}`;
}

/** The URL actually used for sync (user override or auto-detected). */
export function getServerUrl(): string {
  const override = useSettingsStore.getState().serverUrl;
  return override ? normalizeServerUrl(override) : getAutoServerUrl();
}

export function useServerUrl(): string {
  const override = useSettingsStore((state) => state.serverUrl);
  return override ? normalizeServerUrl(override) : getAutoServerUrl();
}
