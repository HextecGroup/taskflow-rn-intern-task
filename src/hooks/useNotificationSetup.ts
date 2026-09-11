import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { openTaskFromOutside } from '../navigation/navigationRef';
import {
  ensureNotificationChannel,
  getNotificationPermission,
  parseNotificationPayload,
  reconcileReminders,
  requestNotificationPermission,
} from '../services/notificationService';
import { useTaskStore } from '../store/taskStore';
import type { NotificationPermissionState } from '../types';

/** App-level notification wiring: channel, reminder reconciliation and tap-to-open. */
export function useNotificationSetup(): void {
  useEffect(() => {
    void (async () => {
      await ensureNotificationChannel().catch(() => undefined);
      const { tasks, setNotificationId } = useTaskStore.getState();
      await reconcileReminders(tasks, setNotificationId);
    })();
  }, []);

  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse): void => {
      const payload = parseNotificationPayload(response.notification.request.content.data);
      if (payload?.taskId) openTaskFromOutside(payload.taskId);
    };

    // Cold start: the app was launched by tapping a notification.
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        handleResponse(response);
        return Notifications.clearLastNotificationResponseAsync();
      })
      .catch(() => undefined);

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, []);
}

/** Permission state that refreshes when the user comes back from the OS settings. */
export function useNotificationPermission(): {
  state: NotificationPermissionState | null;
  request: () => Promise<boolean>;
  refresh: () => Promise<void>;
} {
  const [state, setState] = useState<NotificationPermissionState | null>(null);

  const refresh = useCallback(async () => {
    setState(await getNotificationPermission());
  }, []);

  const request = useCallback(async () => {
    const granted = await requestNotificationPermission();
    await refresh();
    return granted;
  }, [refresh]);

  useEffect(() => {
    let active = true;
    const load = (): void => {
      void getNotificationPermission().then((value) => {
        if (active) setState(value);
      });
    };
    load();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') load();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return { state, request, refresh };
}
