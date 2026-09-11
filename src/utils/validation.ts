import type { Attachment, GeoCoordinates, TaskStatus } from '../types';
import {
  ADDRESS_MAX_LENGTH,
  ADDRESS_MIN_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  DESCRIPTION_MIN_LENGTH,
  MAX_ATTACHMENTS_PER_TASK,
  REMINDER_LEAD_MINUTES,
  TITLE_MAX_LENGTH,
  TITLE_MIN_LENGTH,
} from './constants';
import { isValidDate } from './date';
import { isClosedStatus } from './status';

/** Raw, editable form values (coordinates are kept as strings while typing). */
export interface TaskFormValues {
  title: string;
  description: string;
  dueDate: Date | null;
  address: string;
  latitude: string;
  longitude: string;
  status: TaskStatus;
  attachments: Attachment[];
}

export type TaskFormField = keyof TaskFormValues;
export type TaskFormErrors = Partial<Record<TaskFormField, string>>;

export interface TaskFormValidation {
  isValid: boolean;
  errors: TaskFormErrors;
  /** Non-blocking hints (e.g. reminder cannot be scheduled 30 minutes ahead). */
  warnings: Partial<Record<'dueDate', string>>;
}

export interface ValidationContext {
  now?: Date;
  /** Due date saved on the task being edited, if any. */
  originalDueDate?: Date | null;
}

function parseNumber(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '') return null;
  if (!/^[-+]?\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

/** Returns validated coordinates or `null` when both inputs are empty/invalid. */
export function parseCoordinates(latitude: string, longitude: string): GeoCoordinates | null {
  const lat = parseNumber(latitude);
  const lng = parseNumber(longitude);
  if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { latitude: lat, longitude: lng };
}

export function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

function validateLength(value: string, label: string, min: number, max: number): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return `${label} is required.`;
  if (trimmed.length < min) return `${label} must be at least ${min} characters.`;
  if (trimmed.length > max) return `${label} must be at most ${max} characters.`;
  return undefined;
}

function validateCoordinate(raw: string, label: string, limit: number): string | undefined {
  const value = parseNumber(raw);
  if (value === null) return undefined;
  if (Number.isNaN(value)) return `${label} must be a number.`;
  if (value < -limit || value > limit) return `${label} must be between -${limit} and ${limit}.`;
  return undefined;
}

export function validateTaskForm(values: TaskFormValues, context: ValidationContext = {}): TaskFormValidation {
  const now = context.now ?? new Date();
  const errors: TaskFormErrors = {};
  const warnings: TaskFormValidation['warnings'] = {};

  const titleError = validateLength(values.title, 'Title', TITLE_MIN_LENGTH, TITLE_MAX_LENGTH);
  if (titleError) errors.title = titleError;

  const descriptionError = validateLength(
    values.description,
    'Description',
    DESCRIPTION_MIN_LENGTH,
    DESCRIPTION_MAX_LENGTH,
  );
  if (descriptionError) errors.description = descriptionError;

  const addressError = validateLength(values.address, 'Location address', ADDRESS_MIN_LENGTH, ADDRESS_MAX_LENGTH);
  if (addressError) errors.address = addressError;

  // Due date: required; must be in the future unless it is the unchanged date of an existing task
  // (so an overdue task can still be edited or closed).
  if (!values.dueDate) {
    errors.dueDate = 'Due date & time is required.';
  } else if (!isValidDate(values.dueDate)) {
    errors.dueDate = 'Due date is invalid.';
  } else {
    const unchanged =
      context.originalDueDate != null && context.originalDueDate.getTime() === values.dueDate.getTime();
    const msUntilDue = values.dueDate.getTime() - now.getTime();
    if (!unchanged && msUntilDue <= 0) {
      errors.dueDate = 'Due date & time must be in the future.';
    } else if (
      !isClosedStatus(values.status) &&
      msUntilDue > 0 &&
      msUntilDue < REMINDER_LEAD_MINUTES * 60_000
    ) {
      warnings.dueDate = `Due in less than ${REMINDER_LEAD_MINUTES} minutes — the ${REMINDER_LEAD_MINUTES}-minute reminder can't be sent in advance, so you'll be notified at the due time instead.`;
    }
  }

  // Coordinates are optional, but must be provided as a valid pair.
  const latError = validateCoordinate(values.latitude, 'Latitude', 90);
  const lngError = validateCoordinate(values.longitude, 'Longitude', 180);
  if (latError) errors.latitude = latError;
  if (lngError) errors.longitude = lngError;
  const hasLat = values.latitude.trim() !== '';
  const hasLng = values.longitude.trim() !== '';
  if (!latError && !lngError && hasLat !== hasLng) {
    if (!hasLat) errors.latitude = 'Latitude is required when longitude is set.';
    if (!hasLng) errors.longitude = 'Longitude is required when latitude is set.';
  }

  if (values.attachments.length > MAX_ATTACHMENTS_PER_TASK) {
    errors.attachments = `A task can have at most ${MAX_ATTACHMENTS_PER_TASK} attachments.`;
  }

  return { isValid: Object.keys(errors).length === 0, errors, warnings };
}

/** Normalises a user-entered server URL: trims, adds scheme, strips trailing slashes. */
export function normalizeServerUrl(raw: string): string {
  let url = raw.trim();
  if (url === '') return url;
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

export function isValidServerUrl(raw: string): boolean {
  const url = normalizeServerUrl(raw);
  return /^https?:\/\/[^\s/:?#]+(:\d{1,5})?(\/[^\s]*)?$/i.test(url);
}
