import { MIN_SCHEDULE_AHEAD_MS, REMINDER_LEAD_MINUTES } from './constants';

export type ReminderPlan =
  | { kind: 'lead'; fireDate: Date }
  | { kind: 'due'; fireDate: Date }
  | { kind: 'none' };

/**
 * Decides when to remind the user about a task:
 *  - normally 30 minutes before the due date;
 *  - if that moment already passed (task due in < 30 min) - at the due time itself;
 *  - if the task is already due - no reminder.
 */
export function planReminder(dueDate: Date, now: Date = new Date()): ReminderPlan {
  const lead = new Date(dueDate.getTime() - REMINDER_LEAD_MINUTES * 60_000);
  if (lead.getTime() - now.getTime() > MIN_SCHEDULE_AHEAD_MS) return { kind: 'lead', fireDate: lead };
  if (dueDate.getTime() - now.getTime() > MIN_SCHEDULE_AHEAD_MS) return { kind: 'due', fireDate: dueDate };
  return { kind: 'none' };
}
