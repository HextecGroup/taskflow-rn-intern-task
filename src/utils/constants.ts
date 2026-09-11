export const CANDIDATE_CODE = 'AA-RN-9722';
export const APP_NAME = 'TaskFlow';

/** Reminder lead time before a task's due date. */
export const REMINDER_LEAD_MINUTES = 30;
/** Delay for the demo "test notification" button. */
export const TEST_NOTIFICATION_DELAY_SECONDS = 30;
/** Minimum distance into the future for a reminder to be worth scheduling. */
export const MIN_SCHEDULE_AHEAD_MS = 5_000;

export const DEFAULT_SERVER_PORT = 3000;
export const SYNC_REQUEST_TIMEOUT_MS = 8_000;
export const SYNC_DEBOUNCE_MS = 1_500;

export const HISTORY_MAX_ENTRIES = 500;

export const MAX_ATTACHMENTS_PER_TASK = 10;
export const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

export const TITLE_MIN_LENGTH = 3;
export const TITLE_MAX_LENGTH = 100;
export const DESCRIPTION_MIN_LENGTH = 5;
export const DESCRIPTION_MAX_LENGTH = 2_000;
export const ADDRESS_MIN_LENGTH = 3;
export const ADDRESS_MAX_LENGTH = 200;

/** Default map region (Tashkent) used when nothing better is known. */
export const DEFAULT_MAP_CENTER = { latitude: 41.3111, longitude: 69.2797 } as const;

export const STORAGE_KEYS = {
  tasks: 'taskflow/tasks',
  history: 'taskflow/history',
  settings: 'taskflow/settings',
  sync: 'taskflow/sync',
} as const;
