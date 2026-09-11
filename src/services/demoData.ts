import type { TaskInput, TaskStatus } from '../types';
import { addMinutes, tomorrowAt } from '../utils/date';
import { changeTaskStatus, createTask } from './taskService';

interface DemoTask {
  input: TaskInput;
  /** Status transitions applied after creation, to populate a realistic status history. */
  transitions: TaskStatus[];
}

function buildDemoTasks(now: Date): DemoTask[] {
  const inDays = (days: number, hour: number): Date =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, hour, 0, 0, 0);

  return [
    {
      input: {
        title: 'Client visit: Chorsu Bazaar supplier',
        description: 'Discuss the Q4 delivery schedule and collect the signed price list.',
        // 31 minutes ahead: the real 30-minute reminder fires about a minute after seeding.
        dueDate: addMinutes(now, 31).toISOString(),
        location: { address: 'Chorsu Bazaar, Tashkent', coordinates: { latitude: 41.3262, longitude: 69.2345 } },
        attachments: [],
        status: 'new',
      },
      transitions: [],
    },
    {
      input: {
        title: 'Deliver contract to Tashkent City office',
        description: 'Hand over two printed copies of the service agreement to the procurement team.',
        dueDate: addMinutes(now, 180).toISOString(),
        location: {
          address: 'Tashkent City Business Center, Tashkent',
          coordinates: { latitude: 41.3155, longitude: 69.2485 },
        },
        attachments: [],
        status: 'new',
      },
      transitions: ['in_progress'],
    },
    {
      input: {
        title: 'Quarterly sales review',
        description: 'Present regional KPIs and the pipeline forecast to the management board.',
        dueDate: tomorrowAt(10, now).toISOString(),
        location: { address: 'Amir Temur Square, Tashkent', coordinates: { latitude: 41.3113, longitude: 69.2797 } },
        attachments: [],
        status: 'new',
      },
      transitions: [],
    },
    {
      input: {
        title: 'Inspect warehouse stock',
        description: 'Count remaining inventory and photograph damaged pallets for the insurance claim.',
        dueDate: inDays(3, 14).toISOString(),
        location: { address: 'Sergeli district warehouse, Tashkent', coordinates: null },
        attachments: [],
        status: 'new',
      },
      transitions: [],
    },
    {
      input: {
        title: 'Team offsite planning',
        description: 'Book the venue and confirm the agenda for the regional sales offsite.',
        dueDate: inDays(2, 16).toISOString(),
        location: { address: 'Magic City Park, Tashkent', coordinates: { latitude: 41.3036, longitude: 69.2459 } },
        attachments: [],
        status: 'new',
      },
      transitions: ['in_progress', 'completed'],
    },
  ];
}

/** Seeds realistic sample tasks through the regular use-cases (history, reminders and sync included). */
export async function seedDemoTasks(): Promise<number> {
  const demoTasks = buildDemoTasks(new Date());
  for (const { input, transitions } of demoTasks) {
    const { task } = await createTask(input);
    for (const status of transitions) {
      await changeTaskStatus(task.id, status);
    }
  }
  return demoTasks.length;
}
