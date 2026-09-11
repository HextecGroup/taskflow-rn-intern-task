export const HISTORY_ACTION_TYPES = [
  'created',
  'updated',
  'status_changed',
  'attachment_changed',
  'deleted',
  'synced',
] as const;
export type HistoryActionType = (typeof HISTORY_ACTION_TYPES)[number];

/**
 * Activity log entry. Field names follow the specification
 * (`timestamp`, `action_type`, `description`).
 */
export interface HistoryLog {
  id: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  action_type: HistoryActionType;
  description: string;
  /** Related task, if the entry concerns a single task. */
  taskId: string | null;
}
