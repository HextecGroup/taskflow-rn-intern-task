import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';
import type { SyncStatus } from '../types';
import { SYNC_STATUS_ICONS, SYNC_STATUS_LABELS } from '../utils/status';

interface SyncStatusBadgeProps {
  status: SyncStatus;
}

export function SyncStatusBadge({ status }: SyncStatusBadgeProps) {
  const theme = useAppTheme();
  const color = theme.custom.sync[status];
  return (
    <View style={styles.badge} accessibilityLabel={`Sync status: ${SYNC_STATUS_LABELS[status]}`}>
      <Icon source={SYNC_STATUS_ICONS[status]} size={14} color={color} />
      <Text style={[styles.label, { color }]}>{SYNC_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
