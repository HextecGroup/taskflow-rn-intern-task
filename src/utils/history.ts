import type { HistoryLog } from '../types';
import { dayKey, formatDayLabel } from './date';

export interface HistorySection {
  key: string;
  title: string;
  data: HistoryLog[];
}

/** Groups (already newest-first) log entries into per-day sections. */
export function groupLogsByDay(logs: readonly HistoryLog[], now: Date = new Date()): HistorySection[] {
  const sections: HistorySection[] = [];
  let current: HistorySection | null = null;
  for (const log of logs) {
    const key = dayKey(log.timestamp);
    if (!current || current.key !== key) {
      current = { key, title: formatDayLabel(log.timestamp, now), data: [] };
      sections.push(current);
    }
    current.data.push(log);
  }
  return sections;
}
