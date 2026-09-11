import { useCallback } from 'react';
import { useColorScheme } from 'react-native';

import { useSettingsStore } from '../store/settingsStore';

/** Resolves the user's theme preference (system / light / dark) to an actual mode. */
export function useIsDarkMode(): boolean {
  const preference = useSettingsStore((state) => state.themePreference);
  const systemScheme = useColorScheme();
  return preference === 'system' ? systemScheme === 'dark' : preference === 'dark';
}

/** Light/Dark switch usable from any screen. */
export function useThemeToggle(): { isDark: boolean; toggle: () => void } {
  const isDark = useIsDarkMode();
  const toggleTheme = useSettingsStore((state) => state.toggleTheme);
  const toggle = useCallback(() => toggleTheme(isDark), [isDark, toggleTheme]);
  return { isDark, toggle };
}
