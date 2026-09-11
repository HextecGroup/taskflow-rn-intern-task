import type { HistoryActionType, SyncStatus, TaskStatus } from '../types';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const STATUS_ICONS: Record<TaskStatus, string> = {
  new: 'star-four-points-outline',
  in_progress: 'progress-clock',
  completed: 'check-circle-outline',
  cancelled: 'cancel',
};

/** Order used when sorting by status (workflow order). */
export const STATUS_SORT_ORDER: Record<TaskStatus, number> = {
  new: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 3,
};

/**
 * Allowed workflow transitions: New -> In Progress -> Completed / Cancelled,
 * plus explicit "reopen" / "restore" paths so mistakes can be undone.
 */
export const STATUS_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  new: ['in_progress', 'completed', 'cancelled'],
  in_progress: ['completed', 'cancelled', 'new'],
  completed: ['in_progress'],
  cancelled: ['new'],
};

/** Verb shown on the button that moves a task into the given status. */
export const STATUS_ACTION_LABELS: Record<TaskStatus, string> = {
  new: 'Restore to New',
  in_progress: 'Start',
  completed: 'Complete',
  cancelled: 'Cancel task',
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

/** Completed and cancelled tasks no longer need reminders. */
export function isClosedStatus(status: TaskStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  pending: 'Pending Sync',
  synced: 'Synced',
  failed: 'Sync Failed',
};

export const SYNC_STATUS_ICONS: Record<SyncStatus, string> = {
  pending: 'cloud-upload-outline',
  synced: 'cloud-check-outline',
  failed: 'cloud-alert',
};

export const HISTORY_ACTION_LABELS: Record<HistoryActionType, string> = {
  created: 'Created',
  updated: 'Updated',
  status_changed: 'Status',
  attachment_changed: 'Attachments',
  deleted: 'Deleted',
  synced: 'Synced',
};

export const HISTORY_ACTION_ICONS: Record<HistoryActionType, string> = {
  created: 'plus-circle-outline',
  updated: 'pencil-outline',
  status_changed: 'swap-horizontal',
  attachment_changed: 'paperclip',
  deleted: 'trash-can-outline',
  synced: 'cloud-sync-outline',
};
