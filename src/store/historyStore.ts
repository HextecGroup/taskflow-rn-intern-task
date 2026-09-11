import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage } from '../services/storage';
import type { HistoryActionType, HistoryLog } from '../types';
import { HISTORY_MAX_ENTRIES, STORAGE_KEYS } from '../utils/constants';
import { createId } from '../utils/id';

interface PersistedHistoryState {
  /** Newest first. */
  logs: HistoryLog[];
}

export interface HistoryState extends PersistedHistoryState {
  addLog: (action: HistoryActionType, description: string, taskId?: string | null) => HistoryLog;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (action, description, taskId = null) => {
        const entry: HistoryLog = {
          id: createId(),
          timestamp: new Date().toISOString(),
          action_type: action,
          description,
          taskId,
        };
        set((state) => ({ logs: [entry, ...state.logs].slice(0, HISTORY_MAX_ENTRIES) }));
        return entry;
      },
      clear: () => set({ logs: [] }),
    }),
    {
      name: STORAGE_KEYS.history,
      version: 1,
      storage: createPersistStorage<PersistedHistoryState>(),
      partialize: (state) => ({ logs: state.logs }),
    },
  ),
);

/** Convenience for non-React code (services). */
export const logHistory = (action: HistoryActionType, description: string, taskId: string | null = null): void => {
  useHistoryStore.getState().addLog(action, description, taskId);
};
