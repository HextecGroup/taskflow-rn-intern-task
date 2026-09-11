import { useEffect, useState } from 'react';

import { useHistoryStore } from '../store/historyStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { useTaskStore } from '../store/taskStore';

const persistApis = [useTaskStore.persist, useHistoryStore.persist, useSettingsStore.persist, useSyncStore.persist];

const allHydrated = (): boolean => persistApis.every((api) => api.hasHydrated());

/** True once every persisted store has been rehydrated from AsyncStorage. */
export function useHydration(): boolean {
  const [hydrated, setHydrated] = useState(allHydrated);

  useEffect(() => {
    if (hydrated) return undefined;
    const check = (): void => {
      if (allHydrated()) setHydrated(true);
    };
    const unsubscribers = persistApis.map((api) => api.onFinishHydration(check));
    check();
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [hydrated]);

  return hydrated;
}
