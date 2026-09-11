import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export type MapProvider = 'react-native-maps' | 'maplibre';

/**
 * Google Maps on Android needs an API key in the native manifest; rendering its MapView
 * without one crashes the app. Expo Go ships its own key and iOS uses Apple Maps, so they keep
 * react-native-maps. Android builds made without GOOGLE_MAPS_API_KEY render with MapLibre and
 * free OpenFreeMap tiles instead, which need no key or billing account.
 */
function detectMapProvider(): MapProvider {
  if (Platform.OS !== 'android') return 'react-native-maps';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'react-native-maps';
  return Constants.expoConfig?.extra?.googleMapsApiKeyConfigured === true ? 'react-native-maps' : 'maplibre';
}

export const MAP_PROVIDER = detectMapProvider();
