import type { Attachment, RemoteTask, StatusChange, Task, TaskStatus } from '../types';
import { TASK_STATUSES } from '../types';

/**
 * Pure Last-Write-Wins (LWW) conflict resolution.
 *
 * The `updatedAt` timestamp of a task is its logical clock. For every task id known locally
 * and/or remotely we decide one action; the sync service performs the side effects.
 */
export type SyncDecision =
  | { type: 'push-create' }
  | { type: 'push-update' }
  | { type: 'pull'; conflict: boolean; restored: boolean }
  | { type: 'delete-remote' }
  | { type: 'purge-local' }
  | { type: 'noop' };

function time(iso: string | null | undefined): number {
  if (!iso) return 0;
  const value = Date.parse(iso);
  return Number.isNaN(value) ? 0 : value;
}

export function isNewer(a: string | null | undefined, b: string | null | undefined): boolean {
  return time(a) > time(b);
}

export function decideSyncAction(local: Task | undefined, remote: RemoteTask | undefined): SyncDecision {
  if (!local) {
    return remote ? { type: 'pull', conflict: false, restored: false } : { type: 'noop' };
  }

  // Locally deleted (tombstone).
  if (local.deletedAt) {
    if (!remote) return { type: 'purge-local' };
    // Someone edited the task on the server after we deleted it: the later write wins.
    if (isNewer(remote.updatedAt, local.deletedAt)) return { type: 'pull', conflict: true, restored: true };
    return { type: 'delete-remote' };
  }

  if (local.syncStatus !== 'synced') {
    if (!remote) return { type: 'push-create' };
    if (isNewer(remote.updatedAt, local.updatedAt)) return { type: 'pull', conflict: true, restored: false };
    return { type: 'push-update' };
  }

  // Local copy is in sync with what we last pushed/pulled.
  if (!remote) {
    // The server lost the record (e.g. db.json was reset). The device is the source of truth, re-upload.
    return { type: 'push-create' };
  }
  if (isNewer(remote.updatedAt, local.updatedAt)) return { type: 'pull', conflict: false, restored: false };
  return { type: 'noop' };
}

/** Strips local-only bookkeeping before sending a task to the server. */
export function toRemoteTask(task: Task): RemoteTask {
  const { syncStatus, lastSyncedAt, syncError, notificationId, deletedAt, ...remote } = task;
  void syncStatus;
  void lastSyncedAt;
  void syncError;
  void notificationId;
  void deletedAt;
  return remote;
}

/** Builds a local task from a server record, preserving device-specific fields. */
export function fromRemoteTask(remote: RemoteTask, existing: Task | undefined, syncedAt: string): Task {
  return {
    ...remote,
    syncStatus: 'synced',
    lastSyncedAt: syncedAt,
    syncError: null,
    notificationId: existing?.notificationId ?? null,
    deletedAt: null,
  };
}

// ---- Defensive parsing of server payloads ----------------------------------------------------

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isString = (value: unknown): value is string => typeof value === 'string';

const isStatus = (value: unknown): value is TaskStatus =>
  isString(value) && (TASK_STATUSES as readonly string[]).includes(value);

function parseAttachment(value: unknown): Attachment | null {
  if (!isRecord(value)) return null;
  const { id, name, mimeType, kind, size, fileName, addedAt } = value;
  if (!isString(id) || !isString(name) || !isString(fileName)) return null;
  return {
    id,
    name,
    fileName,
    mimeType: isString(mimeType) ? mimeType : 'application/octet-stream',
    kind: kind === 'pdf' ? 'pdf' : 'image',
    size: typeof size === 'number' ? size : null,
    addedAt: isString(addedAt) ? addedAt : new Date(0).toISOString(),
  };
}

function parseStatusChange(value: unknown): StatusChange | null {
  if (!isRecord(value) || !isStatus(value.to) || !isString(value.changedAt)) return null;
  return { from: isStatus(value.from) ? value.from : null, to: value.to, changedAt: value.changedAt };
}

/**
 * Validates an untrusted server record. Malformed records (e.g. hand-edited db.json)
 * are skipped instead of corrupting local state.
 */
export function parseRemoteTask(value: unknown): RemoteTask | null {
  if (!isRecord(value)) return null;
  const { id, title, description, dueDate, location, attachments, status, statusHistory, createdAt, updatedAt } =
    value;
  if (!isString(id) || !isString(title) || !isString(dueDate) || !isStatus(status)) return null;
  if (Number.isNaN(Date.parse(dueDate))) return null;

  let address = '';
  let coordinates: RemoteTask['location']['coordinates'] = null;
  if (isRecord(location)) {
    address = isString(location.address) ? location.address : '';
    const coords = location.coordinates;
    if (isRecord(coords) && typeof coords.latitude === 'number' && typeof coords.longitude === 'number') {
      coordinates = { latitude: coords.latitude, longitude: coords.longitude };
    }
  }

  const created = isString(createdAt) ? createdAt : new Date(0).toISOString();
  return {
    id,
    title,
    description: isString(description) ? description : '',
    dueDate,
    location: { address, coordinates },
    attachments: Array.isArray(attachments)
      ? attachments.map(parseAttachment).filter((a): a is Attachment => a !== null)
      : [],
    status,
    statusHistory: Array.isArray(statusHistory)
      ? statusHistory.map(parseStatusChange).filter((s): s is StatusChange => s !== null)
      : [],
    createdAt: created,
    updatedAt: isString(updatedAt) ? updatedAt : created,
  };
}
