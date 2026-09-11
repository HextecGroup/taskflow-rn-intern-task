import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage } from '../services/storage';
import { STORAGE_KEYS } from '../utils/constants';

export interface SyncSummary {
  pushed: number;
  pulled: number;
  deleted: number;
  conflicts: number;
  failed: number;
}

interface PersistedSyncState {
  lastSyncAt: string | null;
  lastError: string | null;
  lastSummary: SyncSummary | null;
}

export interface SyncState extends PersistedSyncState {
  /** `null` until NetInfo reports for the first time. */
  isOnline: boolean | null;
  isSyncing: boolean;
  setOnline: (online: boolean) => void;
  startSync: () => void;
  finishSync: (result: { at: string | null; error: string | null; summary: SyncSummary | null }) => void;
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set) => ({
      isOnline: null,
      isSyncing: false,
      lastSyncAt: null,
      lastError: null,
      lastSummary: null,
      setOnline: (isOnline) => set({ isOnline }),
      startSync: () => set({ isSyncing: true }),
      finishSync: ({ at, error, summary }) =>
        set((state) => ({
          isSyncing: false,
          lastSyncAt: at ?? state.lastSyncAt,
          lastError: error,
          lastSummary: summary ?? state.lastSummary,
        })),
    }),
    {
      name: STORAGE_KEYS.sync,
      version: 1,
      storage: createPersistStorage<PersistedSyncState>(),
      partialize: ({ lastSyncAt, lastError, lastSummary }) => ({ lastSyncAt, lastError, lastSummary }),
    },
  ),
);
