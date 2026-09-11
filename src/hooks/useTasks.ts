import { useCallback, useMemo } from 'react';

import { useHistoryStore } from '../store/historyStore';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import type { HistoryLog, Task } from '../types';
import { filterTasks, sortTasks, type TaskFilter } from '../utils/sort';

/** All tasks except local tombstones. Memoised so the reference is stable between renders. */
export function useVisibleTasks(): Task[] {
  const tasks = useTaskStore((state) => state.tasks);
  return useMemo(() => tasks.filter((task) => !task.deletedAt), [tasks]);
}

export function useTask(taskId: string | undefined): Task | undefined {
  return useTaskStore(
    useCallback(
      (state) => (taskId ? state.tasks.find((task) => task.id === taskId && !task.deletedAt) : undefined),
      [taskId],
    ),
  );
}

/** Filtered + sorted list according to the persisted sort preference. `now` comes from `useNow`. */
export function useTaskList(filter: TaskFilter, now: number): { tasks: Task[]; totalCount: number } {
  const visible = useVisibleTasks();
  const sortKey = useSettingsStore((state) => state.sortKey);
  const sortDirection = useSettingsStore((state) => state.sortDirection);
  const tasks = useMemo(
    () => sortTasks(filterTasks(visible, filter, new Date(now)), sortKey, sortDirection),
    [visible, filter, now, sortKey, sortDirection],
  );
  return { tasks, totalCount: visible.length };
}

/** Number of local changes waiting for the server (tombstones included). */
export function useSyncCounts(): { pending: number; failed: number } {
  const tasks = useTaskStore((state) => state.tasks);
  return useMemo(
    () => ({
      pending: tasks.filter((task) => task.syncStatus === 'pending').length,
      failed: tasks.filter((task) => task.syncStatus === 'failed').length,
    }),
    [tasks],
  );
}

export function useTaskActivity(taskId: string): HistoryLog[] {
  const logs = useHistoryStore((state) => state.logs);
  return useMemo(() => logs.filter((log) => log.taskId === taskId), [logs, taskId]);
}
