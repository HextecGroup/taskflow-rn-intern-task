/**
 * Small, dependency-free date helpers. Formatting is done manually so output is
 * identical across Hermes builds regardless of available Intl locale data.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const pad = (value: number): string => String(value).padStart(2, '0');

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatTime(value: string | Date): string {
  const date = toDate(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(value: string | Date): string {
  const date = toDate(value);
  return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function formatDateTime(value: string | Date): string {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function formatShortDateTime(value: string | Date): string {
  const date = toDate(value);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${formatTime(date)}`;
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Today", "Yesterday" or a full date - used for grouping history entries. */
export function formatDayLabel(value: string | Date, now: Date = new Date()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(toDate(value))) / DAY);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(value);
}

export function dayKey(value: string | Date): string {
  const date = toDate(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function describeSpan(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MINUTE) return 'less than a minute';
  if (abs < HOUR) {
    const minutes = Math.round(abs / MINUTE);
    return `${minutes} min`;
  }
  if (abs < DAY) {
    const hours = Math.floor(abs / HOUR);
    const minutes = Math.round((abs % HOUR) / MINUTE);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  const days = Math.round(abs / DAY);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** "in 2h 5m", "3 days ago", ... */
export function formatRelative(value: string | Date, now: Date = new Date()): string {
  const diff = toDate(value).getTime() - now.getTime();
  const span = describeSpan(diff);
  if (span === 'less than a minute') return diff >= 0 ? 'in under a minute' : 'just now';
  return diff >= 0 ? `in ${span}` : `${span} ago`;
}

export function minutesUntil(value: string | Date, now: Date = new Date()): number {
  return (toDate(value).getTime() - now.getTime()) / MINUTE;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE);
}

/** Tomorrow at the given local hour. */
export function tomorrowAt(hour: number, now: Date = new Date()): Date {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, 0, 0, 0);
  return date;
}

/** Keeps the calendar day of `day` and the clock time of `time`. */
export function combineDateAndTime(day: Date, time: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes(), 0, 0);
}

export function compareIso(a: string, b: string): number {
  return Date.parse(a) - Date.parse(b);
}
