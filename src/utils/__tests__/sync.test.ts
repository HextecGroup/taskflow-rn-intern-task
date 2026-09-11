import type { RemoteTask, Task } from '../../types';
import { decideSyncAction, fromRemoteTask, parseRemoteTask, toRemoteTask } from '../sync';

const T0 = '2026-09-11T10:00:00.000Z';
const T1 = '2026-09-11T11:00:00.000Z';
const T2 = '2026-09-11T12:00:00.000Z';

const localTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Local title',
  description: 'Description',
  dueDate: '2026-12-01T09:00:00.000Z',
  location: { address: 'Tashkent', coordinates: null },
  attachments: [],
  status: 'new',
  statusHistory: [{ from: null, to: 'new', changedAt: T0 }],
  createdAt: T0,
  updatedAt: T1,
  syncStatus: 'pending',
  lastSyncedAt: null,
  syncError: null,
  notificationId: 'notif-1',
  deletedAt: null,
  ...overrides,
});

const remoteTask = (overrides: Partial<RemoteTask> = {}): RemoteTask => ({
  ...toRemoteTask(localTask()),
  title: 'Remote title',
  ...overrides,
});

describe('decideSyncAction (Last-Write-Wins)', () => {
  it('pulls tasks that only exist on the server', () => {
    expect(decideSyncAction(undefined, remoteTask())).toEqual({ type: 'pull', conflict: false, restored: false });
  });

  it('creates unsynced local tasks missing on the server', () => {
    expect(decideSyncAction(localTask(), undefined)).toEqual({ type: 'push-create' });
  });

  it('pushes a pending local change that is newer than the server copy', () => {
    expect(decideSyncAction(localTask({ updatedAt: T2 }), remoteTask({ updatedAt: T1 }))).toEqual({
      type: 'push-update',
    });
  });

  it('keeps the server version when it was written later (conflict)', () => {
    expect(decideSyncAction(localTask({ updatedAt: T1 }), remoteTask({ updatedAt: T2 }))).toEqual({
      type: 'pull',
      conflict: true,
      restored: false,
    });
  });

  it('treats failed tasks like pending ones', () => {
    expect(decideSyncAction(localTask({ syncStatus: 'failed' }), undefined)).toEqual({ type: 'push-create' });
  });

  it('pulls newer server edits of synced tasks without flagging a conflict', () => {
    expect(
      decideSyncAction(localTask({ syncStatus: 'synced', updatedAt: T1 }), remoteTask({ updatedAt: T2 })),
    ).toEqual({ type: 'pull', conflict: false, restored: false });
  });

  it('does nothing when a synced task is unchanged', () => {
    expect(
      decideSyncAction(localTask({ syncStatus: 'synced', updatedAt: T1 }), remoteTask({ updatedAt: T1 })),
    ).toEqual({ type: 'noop' });
  });

  it('re-uploads synced tasks the server lost', () => {
    expect(decideSyncAction(localTask({ syncStatus: 'synced' }), undefined)).toEqual({ type: 'push-create' });
  });

  describe('tombstones', () => {
    it('purges locally when the server no longer has the task', () => {
      expect(decideSyncAction(localTask({ deletedAt: T2 }), undefined)).toEqual({ type: 'purge-local' });
    });

    it('deletes on the server when the local deletion is newer', () => {
      expect(decideSyncAction(localTask({ deletedAt: T2 }), remoteTask({ updatedAt: T1 }))).toEqual({
        type: 'delete-remote',
      });
    });

    it('restores the task when the server edit happened after the deletion', () => {
      expect(decideSyncAction(localTask({ deletedAt: T1 }), remoteTask({ updatedAt: T2 }))).toEqual({
        type: 'pull',
        conflict: true,
        restored: true,
      });
    });
  });
});

describe('task mapping', () => {
  it('strips local-only fields before upload', () => {
    const remote = toRemoteTask(localTask());
    expect(remote).not.toHaveProperty('syncStatus');
    expect(remote).not.toHaveProperty('notificationId');
    expect(remote).not.toHaveProperty('deletedAt');
    expect(remote.title).toBe('Local title');
  });

  it('keeps the device notification id when applying a server version', () => {
    const merged = fromRemoteTask(remoteTask(), localTask(), T2);
    expect(merged).toMatchObject({ title: 'Remote title', syncStatus: 'synced', lastSyncedAt: T2, notificationId: 'notif-1' });
  });
});

describe('parseRemoteTask', () => {
  it('rejects malformed records', () => {
    expect(parseRemoteTask(null)).toBeNull();
    expect(parseRemoteTask({ id: 1, title: 'x' })).toBeNull();
    expect(parseRemoteTask({ id: 'a', title: 'x', dueDate: 'not a date', status: 'new' })).toBeNull();
    expect(parseRemoteTask({ id: 'a', title: 'x', dueDate: T0, status: 'unknown' })).toBeNull();
  });

  it('fills defaults for optional fields', () => {
    const parsed = parseRemoteTask({ id: 'a', title: 'x', dueDate: T0, status: 'in_progress', createdAt: T0 });
    expect(parsed).toEqual({
      id: 'a',
      title: 'x',
      description: '',
      dueDate: T0,
      location: { address: '', coordinates: null },
      attachments: [],
      status: 'in_progress',
      statusHistory: [],
      createdAt: T0,
      updatedAt: T0,
    });
  });
});
