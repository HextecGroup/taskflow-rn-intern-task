import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config.
 * Build-time environment variables (local: copy .env.example to .env; EAS: `eas env:create`):
 *  - GOOGLE_MAPS_API_KEY  - required for maps in standalone Android builds (not needed in Expo Go or on iOS).
 *  - EXPO_PUBLIC_API_URL  - default json-server URL baked into the build (can still be changed in Settings).
 */
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'TaskFlow',
  slug: 'taskflow-aa-rn-9722',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // "automatic" is required for the system Light/Dark preference to be reported to the app.
  userInterfaceStyle: 'automatic',
  scheme: 'taskflow',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.aarn9722.taskflow',
    infoPlist: {
      // The mock json-server is plain HTTP on the local network.
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
    },
  },
  android: {
    package: 'com.aarn9722.taskflow',
    adaptiveIcon: {
      backgroundColor: '#E0E7FF',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['android.permission.SCHEDULE_EXACT_ALARM'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-font',
    'expo-status-bar',
    'expo-sharing',
    '@react-native-community/datetimepicker',
    [
      'expo-build-properties',
      {
        // Allow http:// requests to the json-server from release (APK) builds.
        android: { usesCleartextTraffic: true },
      },
    ],
    ['expo-notifications', { color: '#4F46E5' }],
    [
      'expo-image-picker',
      {
        photosPermission: 'TaskFlow needs access to your photos to attach images to tasks.',
        cameraPermission: 'TaskFlow needs camera access to take photos for task attachments.',
        // Only still images are captured - do not request RECORD_AUDIO.
        microphonePermission: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'TaskFlow uses your location to place tasks on the map.',
      },
    ],
    ['react-native-maps', googleMapsApiKey ? { androidGoogleMapsApiKey: googleMapsApiKey } : {}],
  ],
  extra: {
    candidateCode: 'AA-RN-9722',
    // Only a flag, never the key itself: lets Android builds without a key show a map fallback instead of crashing.
    googleMapsApiKeyConfigured: Boolean(googleMapsApiKey),
  },
});
