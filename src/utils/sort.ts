import type { SortDirection, Task, TaskSortKey, TaskStatus } from '../types';
import { compareIso } from './date';
import { isClosedStatus, STATUS_SORT_ORDER } from './status';

export const SORT_LABELS: Record<TaskSortKey, string> = {
  createdAt: 'Date Added',
  dueDate: 'Due Date',
  status: 'Status',
};

function compareTasks(a: Task, b: Task, key: TaskSortKey): number {
  switch (key) {
    case 'createdAt':
      return compareIso(a.createdAt, b.createdAt);
    case 'dueDate':
      return compareIso(a.dueDate, b.dueDate);
    case 'status': {
      const byStatus = STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status];
      // Within the same status, the most urgent task comes first.
      return byStatus !== 0 ? byStatus : compareIso(a.dueDate, b.dueDate);
    }
  }
}

/** Returns a new, sorted array (never mutates the input). */
export function sortTasks(tasks: readonly Task[], key: TaskSortKey, direction: SortDirection): Task[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...tasks].sort((a, b) => {
    const result = compareTasks(a, b, key) * factor;
    // Stable, deterministic tie-breaker.
    return result !== 0 ? result : a.id.localeCompare(b.id);
  });
}

export type DueFilter = 'all' | 'overdue' | 'today' | 'week';

export const DUE_FILTERS: readonly DueFilter[] = ['all', 'overdue', 'today', 'week'];

export const DUE_FILTER_LABELS: Record<DueFilter, string> = {
  all: 'Any date',
  overdue: 'Overdue',
  today: 'Due today',
  week: 'Next 7 days',
};

export interface TaskFilter {
  query: string;
  status: TaskStatus | 'all';
  due: DueFilter;
}

function matchesDue(task: Task, due: DueFilter, now: Date): boolean {
  const dueAt = Date.parse(task.dueDate);
  switch (due) {
    case 'all':
      return true;
    case 'overdue':
      return !isClosedStatus(task.status) && dueAt < now.getTime();
    case 'today': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      return dueAt >= start && dueAt < end;
    }
    case 'week':
      return dueAt >= now.getTime() && dueAt <= now.getTime() + 7 * 24 * 60 * 60_000;
  }
}

export function filterTasks(tasks: readonly Task[], filter: TaskFilter, now: Date = new Date()): Task[] {
  const query = filter.query.trim().toLowerCase();
  return tasks.filter((task) => {
    if (filter.status !== 'all' && task.status !== filter.status) return false;
    if (!matchesDue(task, filter.due, now)) return false;
    if (query === '') return true;
    return (
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query) ||
      task.location.address.toLowerCase().includes(query)
    );
  });
}
