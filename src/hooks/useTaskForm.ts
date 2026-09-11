import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  deleteAttachmentFiles,
  pickDocuments,
  pickImagesFromLibrary,
  takePhoto,
  type AttachmentPickResult,
} from '../services/attachmentService';
import { createTask, updateTask, type TaskMutationResult } from '../services/taskService';
import { notify } from '../store/uiStore';
import type { GeoCoordinates, Task, TaskInput, TaskStatus } from '../types';
import { TASK_STATUSES } from '../types';
import { MAX_ATTACHMENTS_PER_TASK } from '../utils/constants';
import { errorMessage, pluralize } from '../utils/format';
import { STATUS_TRANSITIONS } from '../utils/status';
import {
  formatCoordinate,
  parseCoordinates,
  validateTaskForm,
  type TaskFormErrors,
  type TaskFormField,
  type TaskFormValues,
} from '../utils/validation';
import { useTask } from './useTasks';

export type AttachmentSource = 'library' | 'camera' | 'documents';

function toFormValues(task: Task | undefined): TaskFormValues {
  const coordinates = task?.location.coordinates ?? null;
  return {
    title: task?.title ?? '',
    description: task?.description ?? '',
    dueDate: task ? new Date(task.dueDate) : null,
    address: task?.location.address ?? '',
    latitude: coordinates ? formatCoordinate(coordinates.latitude) : '',
    longitude: coordinates ? formatCoordinate(coordinates.longitude) : '',
    status: task?.status ?? 'new',
    attachments: task?.attachments ?? [],
  };
}

function sameValues(a: TaskFormValues, b: TaskFormValues): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    (a.dueDate?.getTime() ?? null) === (b.dueDate?.getTime() ?? null) &&
    a.address === b.address &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.status === b.status &&
    a.attachments.map((x) => x.id).join('|') === b.attachments.map((x) => x.id).join('|')
  );
}

function pickFrom(source: AttachmentSource, remaining: number): Promise<AttachmentPickResult> {
  switch (source) {
    case 'library':
      return pickImagesFromLibrary(remaining);
    case 'camera':
      return takePhoto();
    case 'documents':
      return pickDocuments();
  }
}

/**
 * All state and behaviour of the create/edit task form, kept out of the screen component.
 * Also owns the lifecycle of files attached during this editing session: files that end up
 * not being saved (removed or form discarded) are deleted from disk.
 */
export function useTaskForm(taskId?: string) {
  const existing = useTask(taskId);
  const [initialValues] = useState(() => toFormValues(existing));
  const [values, setValues] = useState<TaskFormValues>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<TaskFormField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Latest values for async callbacks and the unmount cleanup (synced after every commit).
  const valuesRef = useRef(values);
  useEffect(() => {
    valuesRef.current = values;
  }, [values]);
  const sessionAttachmentIds = useRef(new Set<string>());
  const savedRef = useRef(false);

  const isEditing = taskId !== undefined;
  const originalDueDate = isEditing ? initialValues.dueDate : null;

  const validation = useMemo(() => validateTaskForm(values, { originalDueDate }), [values, originalDueDate]);

  const errors = useMemo<TaskFormErrors>(() => {
    if (submitAttempted) return validation.errors;
    const visible: TaskFormErrors = {};
    (Object.keys(validation.errors) as TaskFormField[]).forEach((field) => {
      if (touched[field]) visible[field] = validation.errors[field];
    });
    return visible;
  }, [validation.errors, touched, submitAttempted]);

  const statusOptions = useMemo<readonly TaskStatus[]>(
    () => (existing ? [existing.status, ...STATUS_TRANSITIONS[existing.status]] : TASK_STATUSES),
    [existing],
  );

  const setField = useCallback(<K extends TaskFormField>(field: K, value: TaskFormValues[K]) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  }, []);

  const touch = useCallback((field: TaskFormField) => {
    setTouched((previous) => (previous[field] ? previous : { ...previous, [field]: true }));
  }, []);

  const setCoordinates = useCallback((coordinates: GeoCoordinates | null) => {
    setValues((previous) => ({
      ...previous,
      latitude: coordinates ? formatCoordinate(coordinates.latitude) : '',
      longitude: coordinates ? formatCoordinate(coordinates.longitude) : '',
    }));
    setTouched((previous) => ({ ...previous, latitude: true, longitude: true }));
  }, []);

  const addAttachments = useCallback(async (source: AttachmentSource) => {
    const remaining = MAX_ATTACHMENTS_PER_TASK - valuesRef.current.attachments.length;
    if (remaining <= 0) {
      notify(`A task can have at most ${MAX_ATTACHMENTS_PER_TASK} attachments.`);
      return;
    }
    setIsImporting(true);
    try {
      const result = await pickFrom(source, remaining);
      switch (result.status) {
        case 'cancelled':
          return;
        case 'permission-denied':
          notify('Camera permission is required to take a photo. You can enable it in the system settings.');
          return;
        case 'error':
          notify(`Could not attach the file: ${result.message}`);
          return;
        case 'success': {
          const accepted = result.attachments.slice(0, remaining);
          const overflow = result.attachments.slice(remaining);
          deleteAttachmentFiles(overflow);
          accepted.forEach((attachment) => sessionAttachmentIds.current.add(attachment.id));
          setValues((previous) => ({ ...previous, attachments: [...previous.attachments, ...accepted] }));
          setTouched((previous) => ({ ...previous, attachments: true }));
          const problems = [...result.rejected];
          if (overflow.length) problems.push(`${pluralize(overflow.length, 'file')} skipped (limit reached).`);
          if (problems.length) notify(problems.join('\n'));
        }
      }
    } finally {
      setIsImporting(false);
    }
  }, []);

  const removeAttachment = useCallback((attachmentId: string) => {
    const target = valuesRef.current.attachments.find((attachment) => attachment.id === attachmentId);
    if (!target) return;
    // Files picked in this session and removed again are orphans: delete them now.
    // Files that belong to the saved task are only deleted once the edit is saved.
    if (sessionAttachmentIds.current.has(attachmentId)) {
      deleteAttachmentFiles([target]);
      sessionAttachmentIds.current.delete(attachmentId);
    }
    setValues((previous) => ({
      ...previous,
      attachments: previous.attachments.filter((attachment) => attachment.id !== attachmentId),
    }));
  }, []);

  const submit = useCallback(async (): Promise<TaskMutationResult | null> => {
    setSubmitAttempted(true);
    const current = valuesRef.current;
    const result = validateTaskForm(current, { originalDueDate });
    if (!result.isValid || !current.dueDate) return null;

    const input: TaskInput = {
      title: current.title.trim(),
      description: current.description.trim(),
      dueDate: current.dueDate.toISOString(),
      location: {
        address: current.address.trim(),
        coordinates: parseCoordinates(current.latitude, current.longitude),
      },
      attachments: current.attachments,
      status: current.status,
    };

    setIsSubmitting(true);
    try {
      const outcome = taskId ? await updateTask(taskId, input) : await createTask(input);
      if (!outcome) {
        notify('This task no longer exists.');
        return null;
      }
      savedRef.current = true;
      setIsSaved(true);
      return outcome;
    } catch (error) {
      notify(errorMessage(error));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [originalDueDate, taskId]);

  // Discarded form: remove files that were copied into app storage but never saved.
  useEffect(
    () => () => {
      if (savedRef.current) return;
      const orphans = valuesRef.current.attachments.filter((a) => sessionAttachmentIds.current.has(a.id));
      deleteAttachmentFiles(orphans);
    },
    [],
  );

  return {
    values,
    errors,
    warnings: validation.warnings,
    errorCount: Object.keys(validation.errors).length,
    isValid: validation.isValid,
    isDirty: !sameValues(values, initialValues),
    isEditing,
    notFound: isEditing && !existing && !isSaved,
    isSubmitting,
    isImporting,
    isSaved,
    statusOptions,
    setField,
    touch,
    setCoordinates,
    addAttachments,
    removeAttachment,
    submit,
  };
}
