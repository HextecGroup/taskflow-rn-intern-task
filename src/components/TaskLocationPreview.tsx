import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { withAlpha } from '../theme/colors';
import type { GeoCoordinates, TaskStatus } from '../types';
import { MapCanvas } from './map/MapCanvas';

interface TaskLocationPreviewProps {
  coordinates: GeoCoordinates;
  status: TaskStatus;
  onPress: () => void;
}

/** Non-interactive mini map; tapping it opens the full Map tab focused on the task. */
export function TaskLocationPreview({ coordinates, status, onPress }: TaskLocationPreviewProps) {
  const theme = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open on the map"
      style={[styles.container, { borderColor: theme.colors.outlineVariant }]}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <MapCanvas
          preview
          initialCenter={coordinates}
          initialSpan={0.012}
          pins={[{ id: 'task', coordinates, color: theme.custom.status[status] }]}
        />
      </View>
      <View style={[styles.hint, { backgroundColor: withAlpha(theme.colors.inverseSurface, 0.85) }]}>
        <Icon source="map-search-outline" size={14} color={theme.colors.inverseOnSurface} />
        <Text variant="labelSmall" style={{ color: theme.colors.inverseOnSurface }}>
          Open in map
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
