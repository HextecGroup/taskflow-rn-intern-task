import type { ReminderResult, Task } from '../types';
import { REMINDER_LEAD_MINUTES } from './constants';
import { formatRelative, formatShortDateTime, formatTime } from './date';
import { isClosedStatus, STATUS_LABELS } from './status';

/** Reminder state of a task, as shown on the details screen. */
export function describeTaskReminder(task: Task, now: Date = new Date()): { text: string; active: boolean } {
  if (isClosedStatus(task.status)) {
    return { text: `No reminder — task is ${STATUS_LABELS[task.status].toLowerCase()}.`, active: false };
  }
  const due = Date.parse(task.dueDate);
  if (due <= now.getTime()) return { text: 'Task is past due.', active: false };
  if (!task.notificationId) {
    return { text: 'No reminder scheduled — notifications may be disabled.', active: false };
  }
  const lead = due - REMINDER_LEAD_MINUTES * 60_000;
  if (lead > now.getTime()) {
    return {
      text: `Reminder at ${formatTime(new Date(lead))} (${REMINDER_LEAD_MINUTES} min before due, ${formatRelative(new Date(lead), now)}).`,
      active: true,
    };
  }
  return { text: `Reminder window reached — task due ${formatRelative(task.dueDate, now)}.`, active: true };
}

/** User-facing summary of what happened with a task's reminder. */
export function describeReminder(result: ReminderResult): string | null {
  switch (result.reason) {
    case 'scheduled':
      return result.fireDate ? `Reminder set for ${formatShortDateTime(result.fireDate)}` : 'Reminder set';
    case 'scheduled-at-due-time':
      return `Due in under ${REMINDER_LEAD_MINUTES} min — you'll be notified at the due time`;
    case 'permission-denied':
      return 'Notifications are disabled — no reminder was scheduled';
    case 'too-late':
      return 'Task is already due — no reminder scheduled';
    case 'error':
      return 'Could not schedule the reminder';
    case 'not-needed':
      return null;
  }
}
