import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';
import type { StatusChange } from '../types';
import { formatDateTime, formatRelative } from '../utils/date';
import { STATUS_ICONS, STATUS_LABELS } from '../utils/status';

interface StatusTimelineProps {
  history: StatusChange[];
}

/** Chronological status history of a task (oldest first). */
export function StatusTimeline({ history }: StatusTimelineProps) {
  const theme = useAppTheme();
  if (history.length === 0) {
    return (
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        No status changes recorded.
      </Text>
    );
  }

  return (
    <View>
      {history.map((change, index) => {
        const color = theme.custom.status[change.to];
        const isLast = index === history.length - 1;
        return (
          <View key={`${change.changedAt}-${index}`} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: color }]}>
                <Icon source={STATUS_ICONS[change.to]} size={12} color={theme.colors.surface} />
              </View>
              {!isLast ? <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
            </View>
            <View style={styles.content}>
              <Text variant="bodyMedium" style={styles.label}>
                {change.from
                  ? `${STATUS_LABELS[change.from]} → ${STATUS_LABELS[change.to]}`
                  : `Created as ${STATUS_LABELS[change.to]}`}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatDateTime(change.changedAt)} · {formatRelative(change.changedAt)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rail: {
    alignItems: 'center',
    width: 22,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 16,
    marginVertical: 2,
  },
  content: {
    flex: 1,
    paddingBottom: 14,
  },
  label: {
    fontWeight: '600',
  },
});
