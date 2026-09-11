import { logHistory, useHistoryStore } from '../store/historyStore';
import { getTask, useTaskStore } from '../store/taskStore';
import type { ReminderResult, Task, TaskInput, TaskStatus } from '../types';
import { diffAttachments, listAttachmentNames, type AttachmentDiff } from '../utils/attachments';
import { formatDateTime, nowIso } from '../utils/date';
import { pluralize } from '../utils/format';
import { createId } from '../utils/id';
import { canTransition, STATUS_LABELS } from '../utils/status';
import { deleteAllAttachmentFiles, deleteAttachmentFiles } from './attachmentService';
import { cancelAllScheduledNotifications, cancelReminder, scheduleTaskReminder } from './notificationService';
import { requestSync } from './syncService';

/**
 * Task use-cases. Every mutation goes through here so that persistence, the history log,
 * reminders and background sync always stay consistent - screens never orchestrate this themselves.
 */

export interface TaskMutationResult {
  task: Task;
  reminder: ReminderResult;
}

const NO_REMINDER: ReminderResult = { notificationId: null, reason: 'not-needed', fireDate: null };

async function refreshReminder(taskId: string, prompt: boolean): Promise<ReminderResult> {
  const task = getTask(taskId);
  if (!task) return NO_REMINDER;
  const result = await scheduleTaskReminder(task, { prompt });
  useTaskStore.getState().setNotificationId(taskId, result.notificationId);
  return result;
}

/** Re-attempts scheduling a task's reminder, prompting for permission if still possible. */
export function rescheduleReminder(taskId: string): Promise<ReminderResult> {
  return refreshReminder(taskId, true);
}

function sameCoordinates(a: Task['location']['coordinates'], b: Task['location']['coordinates']): boolean {
  if (!a || !b) return a === b;
  return a.latitude === b.latitude && a.longitude === b.longitude;
}

function logAttachmentChanges(title: string, diff: AttachmentDiff, taskId: string): void {
  if (diff.added.length > 0) {
    logHistory(
      'attachment_changed',
      `Attached ${pluralize(diff.added.length, 'file')} to “${title}”: ${listAttachmentNames(diff.added)}.`,
      taskId,
    );
  }
  if (diff.removed.length > 0) {
    logHistory(
      'attachment_changed',
      `Removed ${pluralize(diff.removed.length, 'file')} from “${title}”: ${listAttachmentNames(diff.removed)}.`,
      taskId,
    );
  }
}

/** Human readable list of changed fields (status and attachments are logged separately). */
export function describeChanges(existing: Task, input: TaskInput): string[] {
  const changes: string[] = [];
  if (existing.title !== input.title) changes.push('title');
  if (existing.description !== input.description) changes.push('description');
  if (Date.parse(existing.dueDate) !== Date.parse(input.dueDate)) changes.push('due date');
  if (
    existing.location.address !== input.location.address ||
    !sameCoordinates(existing.location.coordinates, input.location.coordinates)
  ) {
    changes.push('location');
  }
  return changes;
}

export async function createTask(input: TaskInput): Promise<TaskMutationResult> {
  const now = nowIso();
  const task: Task = {
    id: createId(),
    ...input,
    statusHistory: [{ from: null, to: input.status, changedAt: now }],
    createdAt: now,
    updatedAt: now,
    syncStatus: 'pending',
    lastSyncedAt: null,
    syncError: null,
    notificationId: null,
    deletedAt: null,
  };
  useTaskStore.getState().addTask(task);
  logHistory('created', `Created “${task.title}” (due ${formatDateTime(task.dueDate)}).`, task.id);
  logAttachmentChanges(task.title, { added: task.attachments, removed: [] }, task.id);

  const reminder = await refreshReminder(task.id, true);
  requestSync();
  return { task: getTask(task.id) ?? task, reminder };
}

export async function updateTask(id: string, input: TaskInput): Promise<TaskMutationResult | null> {
  const existing = getTask(id);
  if (!existing || existing.deletedAt) return null;

  const changes = describeChanges(existing, input);
  const attachmentDiff = diffAttachments(existing.attachments, input.attachments);
  const attachmentsChanged = attachmentDiff.added.length > 0 || attachmentDiff.removed.length > 0;
  const statusChanged = existing.status !== input.status;
  if (changes.length === 0 && !statusChanged && !attachmentsChanged) {
    return { task: existing, reminder: { notificationId: existing.notificationId, reason: 'not-needed', fireDate: null } };
  }
  if (statusChanged && !canTransition(existing.status, input.status)) {
    throw new Error(`Cannot change status from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[input.status]}.`);
  }

  const now = nowIso();
  useTaskStore.getState().updateTask(id, (task) => ({
    ...task,
    ...input,
    statusHistory: statusChanged
      ? [...task.statusHistory, { from: task.status, to: input.status, changedAt: now }]
      : task.statusHistory,
    updatedAt: now,
    syncStatus: 'pending',
    syncError: null,
  }));

  deleteAttachmentFiles(attachmentDiff.removed);

  if (changes.length > 0) logHistory('updated', `Updated “${input.title}”: ${changes.join(', ')}.`, id);
  logAttachmentChanges(input.title, attachmentDiff, id);
  if (statusChanged) {
    logHistory(
      'status_changed',
      `“${input.title}”: ${STATUS_LABELS[existing.status]} → ${STATUS_LABELS[input.status]}.`,
      id,
    );
  }

  const reminder = await refreshReminder(id, true);
  requestSync();
  return { task: getTask(id) ?? existing, reminder };
}

export async function changeTaskStatus(id: string, to: TaskStatus): Promise<TaskMutationResult | null> {
  const existing = getTask(id);
  if (!existing || existing.deletedAt || existing.status === to) return null;
  if (!canTransition(existing.status, to)) {
    throw new Error(`Cannot change status from ${STATUS_LABELS[existing.status]} to ${STATUS_LABELS[to]}.`);
  }

  const now = nowIso();
  useTaskStore.getState().updateTask(id, (task) => ({
    ...task,
    status: to,
    statusHistory: [...task.statusHistory, { from: task.status, to, changedAt: now }],
    updatedAt: now,
    syncStatus: 'pending',
    syncError: null,
  }));
  logHistory('status_changed', `“${existing.title}”: ${STATUS_LABELS[existing.status]} → ${STATUS_LABELS[to]}.`, id);

  const reminder = await refreshReminder(id, false);
  requestSync();
  return { task: getTask(id) ?? existing, reminder };
}

/**
 * Deletes a task locally. A tombstone is kept until the deletion reaches the server,
 * so the next sync can propagate it (or apply last-write-wins against a newer server edit).
 */
export async function deleteTask(id: string): Promise<void> {
  const existing = getTask(id);
  if (!existing || existing.deletedAt) return;

  await cancelReminder(existing.notificationId);
  deleteAttachmentFiles(existing.attachments);

  const now = nowIso();
  useTaskStore.getState().updateTask(id, (task) => ({
    ...task,
    deletedAt: now,
    notificationId: null,
    syncStatus: 'pending',
    syncError: null,
  }));
  logHistory('deleted', `Deleted “${existing.title}”.`, id);
  requestSync(300);
}

/** Wipes tasks, attachments, reminders and history (settings are kept). */
export async function resetAllData(): Promise<void> {
  await cancelAllScheduledNotifications();
  deleteAllAttachmentFiles();
  useTaskStore.getState().replaceAll([]);
  useHistoryStore.getState().clear();
}
