import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPersistStorage } from '../services/storage';
import type { RemoteTask, Task } from '../types';
import { STORAGE_KEYS } from '../utils/constants';
import { fromRemoteTask } from '../utils/sync';

interface PersistedTaskState {
  tasks: Task[];
}

export interface TaskState extends PersistedTaskState {
  addTask: (task: Task) => void;
  /** Applies `updater` to a task; returns the updated task. */
  updateTask: (id: string, updater: (task: Task) => Task) => Task | undefined;
  /** Local-only field: does not touch `updatedAt` or the sync status. */
  setNotificationId: (id: string, notificationId: string | null) => void;
  removeTask: (id: string) => void;
  replaceAll: (tasks: Task[]) => void;

  // ---- Sync bookkeeping (called by the sync service) ----
  /** Marks a task as synced, unless it was modified locally while the request was in flight. */
  markSynced: (id: string, expectedUpdatedAt: string, syncedAt: string) => void;
  markSyncFailed: (ids: readonly string[], error: string) => void;
  /** Replaces/inserts a task with the server version, unless it changed locally in the meantime. */
  applyRemoteTask: (remote: RemoteTask, expectedUpdatedAt: string | null, syncedAt: string) => Task | undefined;
}

const mapTask = (tasks: Task[], id: string, updater: (task: Task) => Task): Task[] =>
  tasks.map((task) => (task.id === id ? updater(task) : task));

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],

      addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),

      updateTask: (id, updater) => {
        const current = get().tasks.find((task) => task.id === id);
        if (!current) return undefined;
        const updated = updater(current);
        set((state) => ({ tasks: mapTask(state.tasks, id, () => updated) }));
        return updated;
      },

      setNotificationId: (id, notificationId) =>
        set((state) => ({ tasks: mapTask(state.tasks, id, (task) => ({ ...task, notificationId })) })),

      removeTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),

      replaceAll: (tasks) => set({ tasks }),

      markSynced: (id, expectedUpdatedAt, syncedAt) =>
        set((state) => ({
          tasks: mapTask(state.tasks, id, (task) =>
            task.updatedAt === expectedUpdatedAt
              ? { ...task, syncStatus: 'synced', lastSyncedAt: syncedAt, syncError: null }
              : task,
          ),
        })),

      markSyncFailed: (ids, error) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            ids.includes(task.id) && task.syncStatus !== 'synced'
              ? { ...task, syncStatus: 'failed', syncError: error }
              : task,
          ),
        })),

      applyRemoteTask: (remote, expectedUpdatedAt, syncedAt) => {
        const existing = get().tasks.find((task) => task.id === remote.id);
        if (existing && existing.updatedAt !== expectedUpdatedAt) return undefined;
        if (!existing && expectedUpdatedAt !== null) return undefined;
        const next = fromRemoteTask(remote, existing, syncedAt);
        set((state) => ({
          tasks: existing ? mapTask(state.tasks, remote.id, () => next) : [next, ...state.tasks],
        }));
        return next;
      },
    }),
    {
      name: STORAGE_KEYS.tasks,
      version: 1,
      storage: createPersistStorage<PersistedTaskState>(),
      partialize: (state) => ({ tasks: state.tasks }),
    },
  ),
);

export const getTask = (id: string): Task | undefined => useTaskStore.getState().tasks.find((task) => task.id === id);
