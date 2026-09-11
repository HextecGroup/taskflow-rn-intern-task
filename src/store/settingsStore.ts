import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage } from '../services/storage';
import type { SortDirection, TaskSortKey, ThemePreference } from '../types';
import { STORAGE_KEYS } from '../utils/constants';

interface PersistedSettings {
  themePreference: ThemePreference;
  /** `null` means "auto-detect" (see serverConfig). */
  serverUrl: string | null;
  autoSync: boolean;
  sortKey: TaskSortKey;
  sortDirection: SortDirection;
}

export interface SettingsState extends PersistedSettings {
  setThemePreference: (preference: ThemePreference) => void;
  /** Flips between light and dark based on what is currently shown. */
  toggleTheme: (currentlyDark: boolean) => void;
  setServerUrl: (url: string | null) => void;
  setAutoSync: (enabled: boolean) => void;
  setSortKey: (key: TaskSortKey) => void;
  toggleSortDirection: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      serverUrl: null,
      autoSync: true,
      sortKey: 'createdAt',
      sortDirection: 'desc',

      setThemePreference: (themePreference) => set({ themePreference }),
      toggleTheme: (currentlyDark) => set({ themePreference: currentlyDark ? 'light' : 'dark' }),
      setServerUrl: (serverUrl) => set({ serverUrl }),
      setAutoSync: (autoSync) => set({ autoSync }),
      setSortKey: (sortKey) =>
        // Sensible default direction per key: newest first, most urgent first, workflow order.
        set({ sortKey, sortDirection: sortKey === 'createdAt' ? 'desc' : 'asc' }),
      toggleSortDirection: () => set((state) => ({ sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' })),
    }),
    {
      name: STORAGE_KEYS.settings,
      version: 1,
      storage: createPersistStorage<PersistedSettings>(),
      partialize: ({ themePreference, serverUrl, autoSync, sortKey, sortDirection }) => ({
        themePreference,
        serverUrl,
        autoSync,
        sortKey,
        sortDirection,
      }),
    },
  ),
);
