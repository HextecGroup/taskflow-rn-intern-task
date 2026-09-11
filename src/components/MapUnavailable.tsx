import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { withAlpha } from '../theme/colors';

interface MapUnavailableProps {
  compact?: boolean;
}

/** Shown instead of a MapView in Android builds made without a Google Maps API key. */
export function MapUnavailable({ compact = false }: MapUnavailableProps) {
  const theme = useAppTheme();
  const color = theme.custom.warning;
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.container,
        compact && styles.compact,
        { backgroundColor: withAlpha(color, theme.dark ? 0.16 : 0.1), borderColor: withAlpha(color, 0.35) },
      ]}
    >
      <Icon source="map-marker-off-outline" size={compact ? 22 : 32} color={color} />
      <View style={styles.text}>
        <Text variant={compact ? 'labelLarge' : 'titleSmall'}>Map unavailable in this build</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {compact
            ? 'Built without a Google Maps API key. Coordinates are still saved.'
            : 'This Android build was made without a Google Maps API key (GOOGLE_MAPS_API_KEY). Tasks, addresses and coordinates keep working — tasks with coordinates are listed below. See README → Building the APK.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  compact: {
    padding: 12,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
