import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { Chip, Divider, IconButton, Text } from 'react-native-paper';

import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { HistoryLogItem } from '../components/HistoryLogItem';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useVisibleTasks } from '../hooks/useTasks';
import type { MainTabScreenProps } from '../navigation/types';
import { useHistoryStore } from '../store/historyStore';
import { notify } from '../store/uiStore';
import { useAppTheme } from '../theme';
import type { HistoryActionType } from '../types';
import { HISTORY_ACTION_TYPES } from '../types';
import { HISTORY_MAX_ENTRIES } from '../utils/constants';
import { pluralize } from '../utils/format';
import { groupLogsByDay } from '../utils/history';
import { HISTORY_ACTION_ICONS, HISTORY_ACTION_LABELS } from '../utils/status';

const Separator = () => <Divider style={styles.divider} />;

export function HistoryScreen({ navigation }: MainTabScreenProps<'History'>) {
  const theme = useAppTheme();
  const logs = useHistoryStore((state) => state.logs);
  const clear = useHistoryStore((state) => state.clear);
  const tasks = useVisibleTasks();
  const [filter, setFilter] = useState<HistoryActionType | 'all'>('all');
  const [confirmClear, setConfirmClear] = useState(false);

  const existingTaskIds = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);
  const filtered = useMemo(
    () => (filter === 'all' ? logs : logs.filter((log) => log.action_type === filter)),
    [logs, filter],
  );
  const sections = useMemo(() => groupLogsByDay(filtered), [filtered]);

  const openTask = useCallback((taskId: string) => navigation.navigate('TaskDetails', { taskId }), [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <IconButton
            icon="delete-sweep-outline"
            disabled={logs.length === 0}
            onPress={() => setConfirmClear(true)}
            accessibilityLabel="Clear history log"
          />
          <ThemeToggleButton />
        </View>
      ),
    });
  }, [navigation, logs.length]);

  const header = (
    <View style={styles.header}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip compact selected={filter === 'all'} showSelectedOverlay onPress={() => setFilter('all')}>
          All ({logs.length})
        </Chip>
        {HISTORY_ACTION_TYPES.map((type) => (
          <Chip
            key={type}
            compact
            icon={HISTORY_ACTION_ICONS[type]}
            selected={filter === type}
            showSelectedOverlay
            onPress={() => setFilter(filter === type ? 'all' : type)}
          >
            {HISTORY_ACTION_LABELS[type]}
          </Chip>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(log) => log.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: theme.colors.surface }}>
            <HistoryLogItem
              log={item}
              onOpenTask={item.taskId && existingTaskIds.has(item.taskId) ? openTask : undefined}
            />
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              {section.title}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {pluralize(section.data.length, 'entry', 'entries')}
            </Text>
          </View>
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="history"
            title={logs.length === 0 ? 'No activity yet' : 'Nothing for this filter'}
            message={
              logs.length === 0
                ? 'Creating, editing, status changes, deletions and syncs are recorded here and kept across restarts.'
                : 'Choose another action type to see more entries.'
            }
          />
        }
        ListFooterComponent={
          logs.length > 0 ? (
            <Text variant="bodySmall" style={[styles.footer, { color: theme.colors.onSurfaceVariant }]}>
              Stored locally · the latest {HISTORY_MAX_ENTRIES} entries are kept
            </Text>
          ) : null
        }
        contentContainerStyle={sections.length === 0 ? styles.grow : undefined}
        stickySectionHeadersEnabled
      />
      <ConfirmDialog
        visible={confirmClear}
        icon="delete-sweep-outline"
        title="Clear history log?"
        message="All activity entries will be removed. Tasks are not affected."
        confirmLabel="Clear"
        destructive
        onConfirm={() => {
          setConfirmClear(false);
          clear();
          notify('History log cleared');
        }}
        onDismiss={() => setConfirmClear(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  grow: {
    flexGrow: 1,
  },
  headerActions: {
    flexDirection: 'row',
  },
  header: {
    paddingVertical: 12,
  },
  chips: {
    gap: 8,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  divider: {
    marginLeft: 66,
  },
  footer: {
    textAlign: 'center',
    padding: 24,
  },
});
