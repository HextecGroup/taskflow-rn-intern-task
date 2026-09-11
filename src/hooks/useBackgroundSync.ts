import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { requestSync } from '../services/syncService';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';

/**
 * Wires the sync engine to its triggers:
 *  - connectivity regained (NetInfo),
 *  - app returning to the foreground,
 *  - app start / auto-sync being switched on.
 * Local mutations trigger sync themselves through the task service.
 */
export function useBackgroundSync(): void {
  const autoSync = useSettingsStore((state) => state.autoSync);

  useEffect(() => {
    let wasOnline: boolean | null = null;
    const unsubscribe = NetInfo.addEventListener((state) => {
      // `isConnected === null` means "unknown" - optimistically allow sync attempts.
      const online = state.isConnected !== false;
      useSyncStore.getState().setOnline(online);
      if (online && wasOnline === false) requestSync(500);
      wasOnline = online;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') requestSync(500);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (autoSync) requestSync(800);
  }, [autoSync]);
}
