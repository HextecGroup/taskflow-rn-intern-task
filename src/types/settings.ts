export type ThemePreference = 'system' | 'light' | 'dark';

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

export type ReminderResultReason =
  | 'scheduled'
  | 'scheduled-at-due-time'
  | 'not-needed'
  | 'too-late'
  | 'permission-denied'
  | 'error';

export interface ReminderResult {
  notificationId: string | null;
  reason: ReminderResultReason;
  /** When the reminder will fire, if scheduled. */
  fireDate: Date | null;
}
