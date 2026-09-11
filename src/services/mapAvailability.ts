import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Google Maps on Android needs an API key in the native manifest; rendering a MapView
 * without one crashes the app. Expo Go ships its own key and iOS uses Apple Maps, so only
 * Android builds made without GOOGLE_MAPS_API_KEY are affected - they get a fallback UI instead.
 */
function detectMapAvailability(): boolean {
  if (Platform.OS !== 'android') return true;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return true;
  return Constants.expoConfig?.extra?.googleMapsApiKeyConfigured === true;
}

export const MAP_AVAILABLE = detectMapAvailability();
