import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Surface, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '../theme';
import type { Task } from '../types';
import { formatRelative, formatShortDateTime } from '../utils/date';
import { isClosedStatus, STATUS_LABELS } from '../utils/status';
import { StatusChip } from './StatusChip';
import { SyncStatusBadge } from './SyncStatusBadge';

interface TaskCardProps {
  task: Task;
  /** Current time (epoch ms) from `useNow`, so relative labels stay fresh and render stays pure. */
  now: number;
  onPress: (task: Task) => void;
  onLongPress?: (task: Task) => void;
  compact?: boolean;
}

function TaskCardComponent({ task, now, onPress, onLongPress, compact = false }: TaskCardProps) {
  const theme = useAppTheme();
  const nowDate = new Date(now);
  const overdue = !isClosedStatus(task.status) && Date.parse(task.dueDate) < now;
  const statusColor = theme.custom.status[task.status];
  const muted = theme.colors.onSurfaceVariant;

  return (
    <Surface
      elevation={0}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
    >
      <TouchableRipple
        onPress={() => onPress(task)}
        onLongPress={onLongPress ? () => onLongPress(task) : undefined}
        accessibilityRole="button"
        accessibilityLabel={`${task.title}, ${STATUS_LABELS[task.status]}, due ${formatShortDateTime(task.dueDate)}`}
        accessibilityHint="Opens task details"
      >
        <View style={styles.row}>
          <View style={[styles.stripe, { backgroundColor: statusColor }]} />
          <View style={styles.content}>
            <View style={styles.header}>
              <Text
                variant="titleMedium"
                numberOfLines={2}
                style={[styles.title, task.status === 'cancelled' && styles.cancelled]}
              >
                {task.title}
              </Text>
              <StatusChip status={task.status} />
            </View>

            {!compact && task.description ? (
              <Text variant="bodySmall" numberOfLines={1} style={{ color: muted }}>
                {task.description}
              </Text>
            ) : null}

            <View style={styles.meta}>
              <Icon source="calendar-clock" size={15} color={overdue ? theme.colors.error : muted} />
              <Text variant="bodySmall" style={{ color: overdue ? theme.colors.error : muted }}>
                {formatShortDateTime(task.dueDate)} ·{' '}
                {overdue ? `Overdue ${formatRelative(task.dueDate, nowDate)}` : formatRelative(task.dueDate, nowDate)}
              </Text>
            </View>

            <View style={styles.meta}>
              <Icon source={task.location.coordinates ? 'map-marker' : 'map-marker-outline'} size={15} color={muted} />
              <Text variant="bodySmall" numberOfLines={1} style={[styles.flex, { color: muted }]}>
                {task.location.address}
              </Text>
            </View>

            <View style={styles.footer}>
              <SyncStatusBadge status={task.syncStatus} />
              {task.attachments.length > 0 ? (
                <View style={styles.meta}>
                  <Icon source="paperclip" size={14} color={muted} />
                  <Text variant="labelSmall" style={{ color: muted }}>
                    {task.attachments.length}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableRipple>
    </Surface>
  );
}

export const TaskCard = memo(TaskCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  stripe: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  cancelled: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
});
