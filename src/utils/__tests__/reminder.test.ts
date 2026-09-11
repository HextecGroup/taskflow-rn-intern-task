import { groupLogsByDay } from '../history';
import { planReminder } from '../reminder';

const NOW = new Date('2026-09-11T10:00:00.000Z');
const inMinutes = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

describe('planReminder', () => {
  it('schedules 30 minutes before the due date', () => {
    expect(planReminder(inMinutes(120), NOW)).toEqual({ kind: 'lead', fireDate: inMinutes(90) });
  });

  it('falls back to the due time when due in less than 30 minutes', () => {
    expect(planReminder(inMinutes(10), NOW)).toEqual({ kind: 'due', fireDate: inMinutes(10) });
  });

  it('skips reminders for tasks that are already due', () => {
    expect(planReminder(inMinutes(-1), NOW)).toEqual({ kind: 'none' });
  });
});

describe('groupLogsByDay', () => {
  it('groups consecutive entries of the same day', () => {
    const now = new Date(2026, 8, 11, 12, 0, 0);
    const at = (day: number, hour: number) => new Date(2026, 8, day, hour).toISOString();
    const sections = groupLogsByDay(
      [
        { id: '1', timestamp: at(11, 10), action_type: 'created', description: 'a', taskId: null },
        { id: '2', timestamp: at(11, 9), action_type: 'updated', description: 'b', taskId: null },
        { id: '3', timestamp: at(10, 18), action_type: 'synced', description: 'c', taskId: null },
      ],
      now,
    );
    expect(sections.map((section) => [section.title, section.data.length])).toEqual([
      ['Today', 2],
      ['Yesterday', 1],
    ]);
  });
});
