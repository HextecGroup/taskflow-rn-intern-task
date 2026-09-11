import { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Button, FAB } from 'react-native-paper';

import { CandidateFooter } from '../components/CandidateFooter';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { TaskCard } from '../components/TaskCard';
import { TaskListToolbar } from '../components/TaskListToolbar';
import { useNow } from '../hooks/useNow';
import { useTaskList } from '../hooks/useTasks';
import type { MainTabScreenProps } from '../navigation/types';
import { seedDemoTasks } from '../services/demoData';
import { describeSyncOutcome, syncNow } from '../services/syncService';
import { deleteTask } from '../services/taskService';
import { useSettingsStore } from '../store/settingsStore';
import { notify } from '../store/uiStore';
import { useAppTheme } from '../theme';
import type { Task, TaskStatus } from '../types';
import { pluralize } from '../utils/format';
import type { DueFilter } from '../utils/sort';

const Separator = () => <View style={styles.separator} />;

export function TaskListScreen({ navigation }: MainTabScreenProps<'Tasks'>) {
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  const now = useNow();
  const filter = useMemo(
    () => ({ query, status: statusFilter, due: dueFilter }),
    [query, statusFilter, dueFilter],
  );
  const { tasks, totalCount } = useTaskList(filter, now);
  const sortKey = useSettingsStore((state) => state.sortKey);
  const sortDirection = useSettingsStore((state) => state.sortDirection);
  const setSortKey = useSettingsStore((state) => state.setSortKey);
  const toggleSortDirection = useSettingsStore((state) => state.toggleSortDirection);

  const openTask = useCallback((task: Task) => navigation.navigate('TaskDetails', { taskId: task.id }), [navigation]);
  const createTask = useCallback(() => navigation.navigate('TaskForm'), [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const outcome = await syncNow();
    setRefreshing(false);
    notify(describeSyncOutcome(outcome));
  }, []);

  const onSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const count = await seedDemoTasks();
      notify(`${pluralize(count, 'demo task')} added`);
    } finally {
      setSeeding(false);
    }
  }, []);

  const confirmDelete = useCallback(async () => {
    const target = pendingDelete;
    setPendingDelete(null);
    if (!target) return;
    await deleteTask(target.id);
    notify(`Deleted “${target.title}”`);
  }, [pendingDelete]);

  const clearFilters = useCallback(() => {
    setQuery('');
    setStatusFilter('all');
    setDueFilter('all');
  }, []);

  const header = (
    <>
      <SyncStatusBar />
      {totalCount > 0 ? (
        <TaskListToolbar
          query={query}
          onQueryChange={setQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          dueFilter={dueFilter}
          onDueFilterChange={setDueFilter}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortKeyChange={setSortKey}
          onToggleSortDirection={toggleSortDirection}
        />
      ) : null}
    </>
  );

  const empty =
    totalCount === 0 ? (
      <EmptyState
        icon="clipboard-text-outline"
        title="No tasks yet"
        message="Create your first task. Everything works offline and syncs automatically when the server is reachable."
        actionLabel="Create task"
        actionIcon="plus"
        onAction={createTask}
      >
        <Button mode="text" icon="database-plus-outline" onPress={onSeed} loading={seeding} disabled={seeding}>
          Load demo tasks
        </Button>
      </EmptyState>
    ) : (
      <EmptyState
        icon="text-search"
        title="No matching tasks"
        message="Try a different search term or status filter."
        actionLabel="Clear filters"
        actionIcon="filter-remove-outline"
        onAction={clearFilters}
      />
    );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={tasks}
        extraData={now}
        keyExtractor={(task) => task.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <TaskCard task={item} now={now} onPress={openTask} onLongPress={setPendingDelete} />
          </View>
        )}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={styles.header}
        ListEmptyComponent={empty}
        ListFooterComponent={<CandidateFooter />}
        contentContainerStyle={[styles.content, tasks.length === 0 && styles.grow]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      />
      <FAB icon="plus" label="New task" style={styles.fab} onPress={createTask} accessibilityLabel="Create a new task" />
      <ConfirmDialog
        visible={pendingDelete !== null}
        icon="trash-can-outline"
        title="Delete task?"
        message={`“${pendingDelete?.title ?? ''}” and its attachments will be removed from this device and from the server on the next sync.`}
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onDismiss={() => setPendingDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 12,
  },
  content: {
    paddingBottom: 96,
  },
  grow: {
    flexGrow: 1,
  },
  item: {
    paddingHorizontal: 16,
  },
  separator: {
    height: 10,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
