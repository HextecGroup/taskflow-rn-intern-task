import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { GlobalSnackbar } from './components/GlobalSnackbar';
import { LoadingScreen } from './components/LoadingScreen';
import { useBackgroundSync } from './hooks/useBackgroundSync';
import { useHydration } from './hooks/useHydration';
import { useNotificationSetup } from './hooks/useNotificationSetup';
import { useIsDarkMode } from './hooks/useThemeMode';
import { flushPendingNavigation, navigationRef } from './navigation/navigationRef';
import { RootNavigator } from './navigation/RootNavigator';
import { configureNotificationHandler } from './services/notificationService';
import { darkTheme, getNavigationTheme, lightTheme } from './theme';

// Foreground presentation must be configured before any notification can arrive.
configureNotificationHandler();

/** Side-effect hooks that need hydrated stores and a mounted navigation container. */
function AppServices() {
  useBackgroundSync();
  useNotificationSetup();
  return <RootNavigator />;
}

function ThemedApp() {
  const hydrated = useHydration();
  const isDark = useIsDarkMode();
  const theme = isDark ? darkTheme : lightTheme;
  const navigationTheme = useMemo(() => getNavigationTheme(theme), [theme]);

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {hydrated ? (
        <NavigationContainer ref={navigationRef} theme={navigationTheme} onReady={flushPendingNavigation}>
          <AppServices />
        </NavigationContainer>
      ) : (
        <LoadingScreen />
      )}
      <GlobalSnackbar />
    </PaperProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemedApp />
    </SafeAreaProvider>
  );
}
