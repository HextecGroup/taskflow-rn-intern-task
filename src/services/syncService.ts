import NetInfo from '@react-native-community/netinfo';

import { logHistory } from '../store/historyStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore, type SyncSummary } from '../store/syncStore';
import { getTask, useTaskStore } from '../store/taskStore';
import type { RemoteTask, Task } from '../types';
import { SYNC_DEBOUNCE_MS } from '../utils/constants';
import { nowIso } from '../utils/date';
import { errorMessage, pluralize } from '../utils/format';
import { decideSyncAction, parseRemoteTask, toRemoteTask } from '../utils/sync';
import { ApiError, tasksApi } from './apiClient';
import { scheduleTaskReminder } from './notificationService';
import { getServerUrl } from './serverConfig';

export type SyncOutcome =
  | { status: 'completed'; summary: SyncSummary }
  | { status: 'skipped'; reason: 'offline' }
  | { status: 'failed'; error: string };

let inFlight: Promise<SyncOutcome> | null = null;
let rerunRequested = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced background sync, triggered after local mutations and connectivity changes. */
export function requestSync(delayMs: number = SYNC_DEBOUNCE_MS): void {
  if (!useSettingsStore.getState().autoSync) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, delayMs);
}

/** Runs a sync immediately. Concurrent calls share the running sync and queue one follow-up run. */
export function syncNow(): Promise<SyncOutcome> {
  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }
  inFlight = runSync().finally(() => {
    inFlight = null;
    if (rerunRequested) {
      rerunRequested = false;
      requestSync(250);
    }
  });
  return inFlight;
}

export function describeSummary(summary: SyncSummary): string {
  const parts: string[] = [];
  if (summary.pushed) parts.push(`${summary.pushed} pushed`);
  if (summary.pulled) parts.push(`${summary.pulled} pulled`);
  if (summary.deleted) parts.push(`${summary.deleted} deleted`);
  if (summary.failed) parts.push(`${summary.failed} failed`);
  const base = parts.length ? parts.join(', ') : 'everything up to date';
  return summary.conflicts
    ? `${base} (${pluralize(summary.conflicts, 'conflict')} resolved by last-write-wins)`
    : base;
}

export function describeSyncOutcome(outcome: SyncOutcome): string {
  switch (outcome.status) {
    case 'completed':
      return outcome.summary.failed
        ? `Sync finished with errors: ${describeSummary(outcome.summary)}`
        : `Sync complete — ${describeSummary(outcome.summary)}`;
    case 'skipped':
      return "You're offline — changes are saved locally and will sync automatically.";
    case 'failed':
      return `Sync failed: ${outcome.error}`;
  }
}

function removeIfStillDeleted(id: string): void {
  if (getTask(id)?.deletedAt) useTaskStore.getState().removeTask(id);
}

function failUnsynced(message: string): void {
  const ids = useTaskStore
    .getState()
    .tasks.filter((task) => task.syncStatus !== 'synced')
    .map((task) => task.id);
  useTaskStore.getState().markSyncFailed(ids, message);
}

async function runSync(): Promise<SyncOutcome> {
  const network = await NetInfo.fetch();
  if (network.isConnected === false) {
    useSyncStore.getState().setOnline(false);
    return { status: 'skipped', reason: 'offline' };
  }

  const baseUrl = getServerUrl();
  useSyncStore.getState().startSync();

  try {
    const payload = await tasksApi.list(baseUrl);
    if (!Array.isArray(payload)) throw new ApiError('Unexpected server response (expected a list of tasks).');

    const remoteById = new Map<string, RemoteTask>();
    for (const raw of payload) {
      const parsed = parseRemoteTask(raw);
      if (parsed) remoteById.set(parsed.id, parsed);
    }
    const localById = new Map(useTaskStore.getState().tasks.map((task) => [task.id, task]));
    const ids = new Set([...localById.keys(), ...remoteById.keys()]);

    const summary: SyncSummary = { pushed: 0, pulled: 0, deleted: 0, conflicts: 0, failed: 0 };
    const pulled: Task[] = [];

    for (const id of ids) {
      const local = localById.get(id);
      const remote = remoteById.get(id);
      const decision = decideSyncAction(local, remote);
      try {
        switch (decision.type) {
          case 'push-create':
          case 'push-update': {
            if (!local) break;
            const body = toRemoteTask(local);
            if (decision.type === 'push-create') await tasksApi.create(baseUrl, body);
            else await tasksApi.update(baseUrl, body);
            useTaskStore.getState().markSynced(id, local.updatedAt, nowIso());
            summary.pushed += 1;
            break;
          }
          case 'pull': {
            if (!remote) break;
            const applied = useTaskStore.getState().applyRemoteTask(remote, local?.updatedAt ?? null, nowIso());
            if (!applied) break; // edited locally mid-sync; will be pushed on the next run
            summary.pulled += 1;
            pulled.push(applied);
            if (decision.conflict) {
              summary.conflicts += 1;
              logHistory(
                'synced',
                decision.restored
                  ? `“${remote.title}” restored: it was edited on the server after being deleted here (last write wins).`
                  : `Conflict on “${remote.title}” resolved: the newer server version was kept (last write wins).`,
                id,
              );
            }
            break;
          }
          case 'delete-remote':
            await tasksApi.remove(baseUrl, id);
            removeIfStillDeleted(id);
            summary.deleted += 1;
            break;
          case 'purge-local':
            removeIfStillDeleted(id);
            break;
          case 'noop':
            break;
        }
      } catch (error) {
        summary.failed += 1;
        useTaskStore.getState().markSyncFailed([id], errorMessage(error));
      }
    }

    // Server-side changes may have moved due dates: keep local reminders consistent.
    for (const task of pulled) {
      const result = await scheduleTaskReminder(task);
      useTaskStore.getState().setNotificationId(task.id, result.notificationId);
    }

    const error = summary.failed > 0 ? `${pluralize(summary.failed, 'task')} failed to sync` : null;
    useSyncStore.getState().finishSync({ at: nowIso(), error, summary });
    if (summary.pushed + summary.pulled + summary.deleted > 0) {
      logHistory('synced', `Synced with server: ${describeSummary(summary)}.`);
    }
    return { status: 'completed', summary };
  } catch (error) {
    const message = errorMessage(error);
    failUnsynced(message);
    useSyncStore.getState().finishSync({ at: null, error: message, summary: null });
    return { status: 'failed', error: message };
  }
}

/** Checks that the json-server is reachable at `baseUrl`. */
export async function testServerConnection(baseUrl: string): Promise<{ ok: true; latencyMs: number } | { ok: false; error: string }> {
  try {
    return { ok: true, latencyMs: await tasksApi.ping(baseUrl) };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
