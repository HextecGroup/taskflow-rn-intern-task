import { IconButton } from 'react-native-paper';

import { useThemeToggle } from '../hooks/useThemeMode';

/** Light/Dark switch shown in every main screen header. */
export function ThemeToggleButton() {
  const { isDark, toggle } = useThemeToggle();
  return (
    <IconButton
      icon={isDark ? 'white-balance-sunny' : 'weather-night'}
      onPress={toggle}
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    />
  );
}
