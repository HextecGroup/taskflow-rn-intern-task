import type { Task, TaskStatus } from '../../types';
import { filterTasks, sortTasks } from '../sort';

const task = (id: string, status: TaskStatus, createdAt: string, dueDate: string, title = id): Task => ({
  id,
  title,
  description: '',
  dueDate,
  location: { address: `${title} street`, coordinates: null },
  attachments: [],
  status,
  statusHistory: [],
  createdAt,
  updatedAt: createdAt,
  syncStatus: 'synced',
  lastSyncedAt: null,
  syncError: null,
  notificationId: null,
  deletedAt: null,
});

const tasks = [
  task('a', 'completed', '2026-09-01T00:00:00Z', '2026-10-03T00:00:00Z'),
  task('b', 'new', '2026-09-03T00:00:00Z', '2026-10-01T00:00:00Z'),
  task('c', 'in_progress', '2026-09-02T00:00:00Z', '2026-10-02T00:00:00Z'),
  task('d', 'new', '2026-09-04T00:00:00Z', '2026-09-30T00:00:00Z', 'Warehouse'),
];

const ids = (list: Task[]) => list.map((item) => item.id);

describe('sortTasks', () => {
  it('sorts by date added', () => {
    expect(ids(sortTasks(tasks, 'createdAt', 'desc'))).toEqual(['d', 'b', 'c', 'a']);
    expect(ids(sortTasks(tasks, 'createdAt', 'asc'))).toEqual(['a', 'c', 'b', 'd']);
  });

  it('sorts by due date', () => {
    expect(ids(sortTasks(tasks, 'dueDate', 'asc'))).toEqual(['d', 'b', 'c', 'a']);
  });

  it('sorts by workflow status, most urgent first within a status', () => {
    expect(ids(sortTasks(tasks, 'status', 'asc'))).toEqual(['d', 'b', 'c', 'a']);
  });

  it('does not mutate the input', () => {
    const copy = [...tasks];
    sortTasks(tasks, 'dueDate', 'desc');
    expect(tasks).toEqual(copy);
  });
});

describe('filterTasks', () => {
  it('filters by status and free-text query', () => {
    expect(ids(filterTasks(tasks, { query: '', status: 'new', due: 'all' }))).toEqual(['b', 'd']);
    expect(ids(filterTasks(tasks, { query: 'warehouse', status: 'all', due: 'all' }))).toEqual(['d']);
  });

  describe('due date ranges', () => {
    const now = new Date(2026, 9, 1, 12, 0, 0); // Oct 1, 12:00 local time
    const at = (month: number, day: number, hour: number) => new Date(2026, month, day, hour).toISOString();
    const dated = [
      task('overdue', 'new', at(8, 1, 0), at(8, 30, 9)),
      task('overdue-done', 'completed', at(8, 1, 0), at(8, 30, 9)),
      task('today', 'in_progress', at(8, 1, 0), at(9, 1, 18)),
      task('in-5-days', 'new', at(8, 1, 0), at(9, 6, 9)),
      task('later', 'new', at(8, 1, 0), at(9, 20, 9)),
    ];
    const byDue = (due: 'overdue' | 'today' | 'week') =>
      ids(filterTasks(dated, { query: '', status: 'all', due }, now));

    it('lists open overdue tasks only', () => {
      expect(byDue('overdue')).toEqual(['overdue']);
    });

    it('lists tasks due today', () => {
      expect(byDue('today')).toEqual(['today']);
    });

    it('lists tasks due within the next 7 days', () => {
      expect(byDue('week')).toEqual(['today', 'in-5-days']);
    });
  });
});
