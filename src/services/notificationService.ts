import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { NotificationPermissionState, ReminderResult, Task } from '../types';
import { CANDIDATE_CODE, REMINDER_LEAD_MINUTES, TEST_NOTIFICATION_DELAY_SECONDS } from '../utils/constants';
import { formatTime } from '../utils/date';
import { planReminder } from '../utils/reminder';
import { isClosedStatus } from '../utils/status';

export const REMINDER_CHANNEL_ID = 'task-reminders';

type NotificationKind = 'task-reminder' | 'test';

export interface NotificationPayload {
  type: NotificationKind;
  taskId?: string;
}

let handlerConfigured = false;

/** Must run once at startup so notifications are shown while the app is in the foreground. */
export function configureNotificationHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Android 8+ requires a channel; Android 13+ requires it before the permission prompt can appear. */
export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Task reminders',
    description: `Reminders ${REMINDER_LEAD_MINUTES} minutes before a task is due`,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4F46E5',
  });
}

export async function getNotificationPermission(): Promise<NotificationPermissionState> {
  try {
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      return 'granted';
    }
    return settings.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

/** Requests permission if it can still be asked; resolves to whether notifications may be shown. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    await ensureNotificationChannel();
    const result = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
    return result.granted || result.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

async function hasPermission(prompt: boolean): Promise<boolean> {
  const state = await getNotificationPermission();
  if (state === 'granted') return true;
  if (state === 'denied' || !prompt) return false;
  return requestNotificationPermission();
}

export async function cancelReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already delivered or never existed - nothing to cancel.
  }
}

/**
 * Cancels the task's current reminder and schedules a new one (30 min before due date,
 * or at the due time if that is already less than 30 minutes away).
 */
export async function scheduleTaskReminder(task: Task, options: { prompt?: boolean } = {}): Promise<ReminderResult> {
  await cancelReminder(task.notificationId);

  if (task.deletedAt || isClosedStatus(task.status)) {
    return { notificationId: null, reason: 'not-needed', fireDate: null };
  }
  const plan = planReminder(new Date(task.dueDate));
  if (plan.kind === 'none') return { notificationId: null, reason: 'too-late', fireDate: null };

  try {
    if (!(await hasPermission(options.prompt ?? false))) {
      return { notificationId: null, reason: 'permission-denied', fireDate: null };
    }
    await ensureNotificationChannel();
    const payload: NotificationPayload = { type: 'task-reminder', taskId: task.id };
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: plan.kind === 'lead' ? `⏰ Due in ${REMINDER_LEAD_MINUTES} minutes` : '⏰ Task is due now',
        body: `${task.title} — ${formatTime(task.dueDate)} · ${task.location.address}`,
        data: { ...payload },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.fireDate,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
    return {
      notificationId,
      reason: plan.kind === 'lead' ? 'scheduled' : 'scheduled-at-due-time',
      fireDate: plan.fireDate,
    };
  } catch (error) {
    console.warn('[notifications] Failed to schedule reminder', error);
    return { notificationId: null, reason: 'error', fireDate: null };
  }
}

export type TestNotificationResult =
  | { ok: true; fireDate: Date }
  | { ok: false; reason: 'permission-denied' | 'error' };

/** Demo helper: fires a notification 30 seconds from now (optionally linked to a task). */
export async function scheduleTestNotification(task?: Pick<Task, 'id' | 'title'>): Promise<TestNotificationResult> {
  try {
    if (!(await hasPermission(true))) return { ok: false, reason: 'permission-denied' };
    await ensureNotificationChannel();
    const payload: NotificationPayload = task ? { type: 'test', taskId: task.id } : { type: 'test' };
    await Notifications.scheduleNotificationAsync({
      content: {
        title: task ? `⏰ Reminder preview: ${task.title}` : '🔔 Test notification',
        body: task
          ? `This is how the ${REMINDER_LEAD_MINUTES}-minute reminder looks. Tap to open the task.`
          : `Local notifications work! Candidate Code: ${CANDIDATE_CODE}`,
        data: { ...payload },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: TEST_NOTIFICATION_DELAY_SECONDS,
        repeats: false,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
    return { ok: true, fireDate: new Date(Date.now() + TEST_NOTIFICATION_DELAY_SECONDS * 1000) };
  } catch (error) {
    console.warn('[notifications] Failed to schedule test notification', error);
    return { ok: false, reason: 'error' };
  }
}

export async function getScheduledNotificationCount(): Promise<number> {
  try {
    return (await Notifications.getAllScheduledNotificationsAsync()).length;
  } catch {
    return 0;
  }
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export function parseNotificationPayload(data: unknown): NotificationPayload | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, taskId } = data as Record<string, unknown>;
  if (type !== 'task-reminder' && type !== 'test') return null;
  return { type, taskId: typeof taskId === 'string' ? taskId : undefined };
}

/**
 * Startup reconciliation between persisted tasks and the OS notification schedule:
 * cancels reminders of tasks that no longer need one, re-schedules missing ones
 * (e.g. after reinstall/data restore) whose 30-minute lead time is still ahead.
 */
export async function reconcileReminders(
  tasks: readonly Task[],
  onScheduled: (taskId: string, notificationId: string | null) => void,
): Promise<void> {
  if ((await getNotificationPermission()) !== 'granted') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const scheduledIds = new Set(scheduled.map((request) => request.identifier));
    const activeTasks = tasks.filter((task) => !task.deletedAt && !isClosedStatus(task.status));
    const activeIds = new Set(activeTasks.map((task) => task.id));

    for (const request of scheduled) {
      const payload = parseNotificationPayload(request.content.data);
      if (payload?.type === 'task-reminder' && payload.taskId && !activeIds.has(payload.taskId)) {
        await cancelReminder(request.identifier);
      }
    }

    for (const task of activeTasks) {
      const alreadyScheduled = task.notificationId != null && scheduledIds.has(task.notificationId);
      if (alreadyScheduled) continue;
      if (planReminder(new Date(task.dueDate)).kind !== 'lead') continue;
      const result = await scheduleTaskReminder(task);
      onScheduled(task.id, result.notificationId);
    }
  } catch (error) {
    console.warn('[notifications] Reconciliation failed', error);
  }
}
