/**
 * Integration test of the sync engine: real Zustand stores + LWW logic,
 * with the network layer replaced by an in-memory json-server double.
 */
import type { RemoteTask, Task } from '../../types';

type Server = Map<string, RemoteTask>;

const mockServer: Server = new Map();
const mockNetwork = { connected: true, reachable: true };
let mockIdCounter = 0;

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => ({ randomUUID: () => `log-${++mockIdCounter}` }));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(async () => ({ isConnected: mockNetwork.connected })) },
}));
jest.mock('../notificationService', () => ({
  scheduleTaskReminder: jest.fn(async () => ({ notificationId: null, reason: 'not-needed', fireDate: null })),
}));
jest.mock('../serverConfig', () => ({ getServerUrl: () => 'http://mock-server' }));
jest.mock('../apiClient', () => {
  const offline = () => {
    if (!mockNetwork.reachable) throw new Error('Server unreachable');
  };
  return {
    ApiError: class ApiError extends Error {},
    tasksApi: {
      list: jest.fn(async () => {
        offline();
        return [...mockServer.values()];
      }),
      create: jest.fn(async (_url: string, task: RemoteTask) => {
        offline();
        mockServer.set(task.id, task);
      }),
      update: jest.fn(async (_url: string, task: RemoteTask) => {
        offline();
        mockServer.set(task.id, task);
      }),
      remove: jest.fn(async (_url: string, id: string) => {
        offline();
        mockServer.delete(id);
      }),
    },
  };
});

// Imported after the mocks are registered.
/* eslint-disable import/first */
import { useHistoryStore } from '../../store/historyStore';
import { useTaskStore } from '../../store/taskStore';
import { syncNow } from '../syncService';
/* eslint-enable import/first */

const T0 = '2026-09-11T10:00:00.000Z';
const T1 = '2026-09-11T11:00:00.000Z';
const T2 = '2026-09-11T12:00:00.000Z';

const makeTask = (id: string, overrides: Partial<Task> = {}): Task => ({
  id,
  title: `Task ${id}`,
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
  notificationId: null,
  deletedAt: null,
  ...overrides,
});

const { syncStatus: _s, lastSyncedAt: _l, syncError: _e, notificationId: _n, deletedAt: _d, ...baseRemote } = makeTask('x');
const makeRemote = (id: string, overrides: Partial<RemoteTask> = {}): RemoteTask => ({
  ...baseRemote,
  id,
  title: `Remote ${id}`,
  ...overrides,
});

const localTask = (id: string) => useTaskStore.getState().tasks.find((task) => task.id === id);

beforeEach(() => {
  mockServer.clear();
  mockNetwork.connected = true;
  mockNetwork.reachable = true;
  useTaskStore.setState({ tasks: [] });
  useHistoryStore.setState({ logs: [] });
});

describe('syncNow', () => {
  it('pushes pending local tasks and marks them synced', async () => {
    useTaskStore.setState({ tasks: [makeTask('a')] });

    const outcome = await syncNow();

    expect(outcome).toMatchObject({ status: 'completed', summary: { pushed: 1 } });
    expect(mockServer.get('a')?.title).toBe('Task a');
    expect(mockServer.get('a')).not.toHaveProperty('syncStatus');
    expect(localTask('a')?.syncStatus).toBe('synced');
    expect(useHistoryStore.getState().logs[0]?.action_type).toBe('synced');
  });

  it('pulls tasks that only exist on the server', async () => {
    mockServer.set('r', makeRemote('r'));

    await syncNow();

    expect(localTask('r')).toMatchObject({ title: 'Remote r', syncStatus: 'synced' });
  });

  it('resolves conflicts with last-write-wins (newer server copy wins)', async () => {
    useTaskStore.setState({ tasks: [makeTask('c', { title: 'Local edit', updatedAt: T1 })] });
    mockServer.set('c', makeRemote('c', { title: 'Server edit', updatedAt: T2 }));

    const outcome = await syncNow();

    expect(outcome).toMatchObject({ status: 'completed', summary: { conflicts: 1, pulled: 1 } });
    expect(localTask('c')?.title).toBe('Server edit');
    expect(mockServer.get('c')?.title).toBe('Server edit');
  });

  it('resolves conflicts with last-write-wins (newer local copy wins)', async () => {
    useTaskStore.setState({ tasks: [makeTask('c', { title: 'Local edit', updatedAt: T2 })] });
    mockServer.set('c', makeRemote('c', { title: 'Server edit', updatedAt: T1 }));

    await syncNow();

    expect(mockServer.get('c')?.title).toBe('Local edit');
    expect(localTask('c')?.syncStatus).toBe('synced');
  });

  it('propagates local deletions and purges the tombstone', async () => {
    useTaskStore.setState({ tasks: [makeTask('d', { deletedAt: T2, syncStatus: 'pending' })] });
    mockServer.set('d', makeRemote('d', { updatedAt: T1 }));

    await syncNow();

    expect(mockServer.has('d')).toBe(false);
    expect(localTask('d')).toBeUndefined();
  });

  it('marks unsynced tasks as failed when the server is unreachable', async () => {
    mockNetwork.reachable = false;
    useTaskStore.setState({ tasks: [makeTask('f')] });

    const outcome = await syncNow();

    expect(outcome.status).toBe('failed');
    expect(localTask('f')).toMatchObject({ syncStatus: 'failed', syncError: 'Server unreachable' });
  });

  it('skips syncing while offline and leaves local data untouched', async () => {
    mockNetwork.connected = false;
    useTaskStore.setState({ tasks: [makeTask('o')] });

    const outcome = await syncNow();

    expect(outcome).toEqual({ status: 'skipped', reason: 'offline' });
    expect(localTask('o')?.syncStatus).toBe('pending');
  });
});
