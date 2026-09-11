/**
 * Core domain model for tasks.
 *
 * Fields are split into two groups:
 *  - Domain fields, which are synchronised with the remote json-server (`RemoteTask`).
 *  - Local-only bookkeeping fields (sync state, notification handle, tombstone), which never leave the device.
 */

export const TASK_STATUSES = ['new', 'in_progress', 'completed', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const SYNC_STATUSES = ['pending', 'synced', 'failed'] as const;
export type SyncStatus = (typeof SYNC_STATUSES)[number];

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface TaskLocation {
  /** Human readable address. Always required. */
  address: string;
  /** Optional precise coordinates (manual input, map pick or geocoding). */
  coordinates: GeoCoordinates | null;
}

export type AttachmentKind = 'image' | 'pdf';

export interface Attachment {
  id: string;
  /** Original, user-facing file name. */
  name: string;
  mimeType: string;
  kind: AttachmentKind;
  /** Size in bytes when known. */
  size: number | null;
  /**
   * File name inside the app's private attachments directory.
   * Stored relative (not as an absolute URI) because the sandbox container path
   * can change between app launches/updates (notably on iOS).
   */
  fileName: string;
  addedAt: string;
}

export interface StatusChange {
  from: TaskStatus | null;
  to: TaskStatus;
  changedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  /** ISO-8601 timestamp. */
  dueDate: string;
  location: TaskLocation;
  attachments: Attachment[];
  status: TaskStatus;
  statusHistory: StatusChange[];
  createdAt: string;
  /** Last local modification. Used as the Last-Write-Wins clock during sync. */
  updatedAt: string;

  // ---- Local-only fields -------------------------------------------------
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  syncError: string | null;
  /** Identifier of the scheduled local reminder notification, if any. */
  notificationId: string | null;
  /** Tombstone timestamp: set when deleted locally but not yet deleted on the server. */
  deletedAt: string | null;
}

export type LocalOnlyTaskField = 'syncStatus' | 'lastSyncedAt' | 'syncError' | 'notificationId' | 'deletedAt';

/** Shape of a task as stored on the json-server. */
export type RemoteTask = Omit<Task, LocalOnlyTaskField>;

/** Validated input used to create or update a task. */
export interface TaskInput {
  title: string;
  description: string;
  dueDate: string;
  location: TaskLocation;
  attachments: Attachment[];
  status: TaskStatus;
}

export type TaskSortKey = 'createdAt' | 'dueDate' | 'status';
export type SortDirection = 'asc' | 'desc';
