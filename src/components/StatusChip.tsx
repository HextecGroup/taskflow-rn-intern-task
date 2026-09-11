import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { withAlpha } from '../theme/colors';
import type { TaskStatus } from '../types';
import { STATUS_ICONS, STATUS_LABELS } from '../utils/status';

interface StatusChipProps {
  status: TaskStatus;
  size?: 'small' | 'medium';
}

export function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const theme = useAppTheme();
  const color = theme.custom.status[status];
  const medium = size === 'medium';
  return (
    <View
      accessibilityLabel={`Status: ${STATUS_LABELS[status]}`}
      style={[
        styles.chip,
        medium && styles.medium,
        { backgroundColor: withAlpha(color, theme.dark ? 0.18 : 0.12), borderColor: withAlpha(color, 0.4) },
      ]}
    >
      <Icon source={STATUS_ICONS[status]} size={medium ? 16 : 13} color={color} />
      <Text style={[styles.label, medium && styles.mediumLabel, { color }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignSelf: 'flex-start',
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  mediumLabel: {
    fontSize: 14,
  },
});
