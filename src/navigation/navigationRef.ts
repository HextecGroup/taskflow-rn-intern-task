import { createNavigationContainerRef } from '@react-navigation/native';

import { getTask } from '../store/taskStore';
import { notify } from '../store/uiStore';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingTaskId: string | null = null;

/**
 * Opens a task from outside the React tree (e.g. a tapped notification).
 * If navigation is not mounted yet (cold start) the request is queued until `onReady`.
 */
export function openTaskFromOutside(taskId: string): void {
  if (!navigationRef.isReady()) {
    pendingTaskId = taskId;
    return;
  }
  const task = getTask(taskId);
  if (!task || task.deletedAt) {
    notify('This task no longer exists.');
    return;
  }
  navigationRef.navigate('TaskDetails', { taskId });
}

export function flushPendingNavigation(): void {
  if (!pendingTaskId) return;
  const taskId = pendingTaskId;
  pendingTaskId = null;
  openTaskFromOutside(taskId);
}
