import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { withAlpha } from '../theme/colors';
import type { HistoryLog } from '../types';
import { formatRelative, formatTime } from '../utils/date';
import { HISTORY_ACTION_ICONS, HISTORY_ACTION_LABELS } from '../utils/status';

interface HistoryLogItemProps {
  log: HistoryLog;
  /** Provided only when the related task still exists. */
  onOpenTask?: (taskId: string) => void;
}

function HistoryLogItemComponent({ log, onOpenTask }: HistoryLogItemProps) {
  const theme = useAppTheme();
  const color = theme.custom.history[log.action_type];
  const canOpen = Boolean(onOpenTask && log.taskId);

  return (
    <TouchableRipple
      disabled={!canOpen}
      onPress={canOpen && log.taskId ? () => onOpenTask?.(log.taskId as string) : undefined}
      accessibilityRole={canOpen ? 'button' : undefined}
    >
      <View style={styles.row}>
        <Avatar.Icon
          size={38}
          icon={HISTORY_ACTION_ICONS[log.action_type]}
          color={color}
          style={{ backgroundColor: withAlpha(color, theme.dark ? 0.2 : 0.12) }}
        />
        <View style={styles.content}>
          <View style={styles.meta}>
            <Text variant="labelSmall" style={[styles.action, { color }]}>
              {HISTORY_ACTION_LABELS[log.action_type].toUpperCase()}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {formatTime(log.timestamp)} · {formatRelative(log.timestamp)}
            </Text>
          </View>
          <Text variant="bodyMedium">{log.description}</Text>
        </View>
        {canOpen ? <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} /> : null}
      </View>
    </TouchableRipple>
  );
}

export const HistoryLogItem = memo(HistoryLogItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  action: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});
