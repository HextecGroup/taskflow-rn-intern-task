import { useLayoutEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Text } from 'react-native-paper';

import { AttachmentTile } from '../components/AttachmentTile';
import { AttachmentViewerModal } from '../components/AttachmentViewerModal';
import { CandidateFooter } from '../components/CandidateFooter';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { HistoryLogItem } from '../components/HistoryLogItem';
import { SectionCard } from '../components/SectionCard';
import { StatusChip } from '../components/StatusChip';
import { StatusTimeline } from '../components/StatusTimeline';
import { SyncStatusBadge } from '../components/SyncStatusBadge';
import { TaskLocationPreview } from '../components/TaskLocationPreview';
import { useNow } from '../hooks/useNow';
import { useTask, useTaskActivity } from '../hooks/useTasks';
import type { RootStackScreenProps } from '../navigation/types';
import { scheduleTestNotification } from '../services/notificationService';
import { changeTaskStatus, deleteTask, rescheduleReminder } from '../services/taskService';
import { notify } from '../store/uiStore';
import { useAppTheme } from '../theme';
import type { Attachment, TaskStatus } from '../types';
import { TEST_NOTIFICATION_DELAY_SECONDS } from '../utils/constants';
import { formatDateTime, formatRelative } from '../utils/date';
import { errorMessage } from '../utils/format';
import { openInExternalMaps } from '../utils/maps';
import { describeReminder, describeTaskReminder } from '../utils/reminderMessage';
import { isClosedStatus, STATUS_ACTION_LABELS, STATUS_ICONS, STATUS_LABELS, STATUS_TRANSITIONS } from '../utils/status';
import { formatCoordinate } from '../utils/validation';

const ACTIVITY_PREVIEW_COUNT = 5;

export function TaskDetailsScreen({ route, navigation }: RootStackScreenProps<'TaskDetails'>) {
  const { taskId } = route.params;
  const task = useTask(taskId);
  const activity = useTaskActivity(taskId);
  const theme = useAppTheme();
  const now = useNow();

  const [viewer, setViewer] = useState<Attachment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busyStatus, setBusyStatus] = useState<TaskStatus | null>(null);
  const [testScheduling, setTestScheduling] = useState(false);

  const exists = task !== undefined;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: exists
        ? () => (
            <View style={styles.headerActions}>
              <IconButton
                icon="pencil-outline"
                onPress={() => navigation.navigate('TaskForm', { taskId })}
                accessibilityLabel="Edit task"
              />
              <IconButton
                icon="trash-can-outline"
                iconColor={theme.colors.error}
                onPress={() => setConfirmDelete(true)}
                accessibilityLabel="Delete task"
              />
            </View>
          )
        : undefined,
    });
  }, [navigation, exists, taskId, theme.colors.error]);

  if (!task) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="file-hidden"
          title="Task not found"
          message="This task no longer exists. It may have been deleted on this device or on the server."
          actionLabel="Back to tasks"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const applyStatus = async (to: TaskStatus): Promise<void> => {
    setBusyStatus(to);
    try {
      const result = await changeTaskStatus(task.id, to);
      if (result) {
        const reminder = describeReminder(result.reminder);
        notify([`Status changed to ${STATUS_LABELS[to]}`, reminder].filter(Boolean).join(' · '));
      }
    } catch (error) {
      notify(errorMessage(error));
    } finally {
      setBusyStatus(null);
    }
  };

  const onDelete = async (): Promise<void> => {
    setConfirmDelete(false);
    const title = task.title;
    navigation.goBack();
    await deleteTask(task.id);
    notify(`Deleted “${title}”`);
  };

  const onTestNotification = async (): Promise<void> => {
    setTestScheduling(true);
    const result = await scheduleTestNotification(task);
    setTestScheduling(false);
    if (result.ok) {
      notify(`Test notification scheduled — it will appear in ${TEST_NOTIFICATION_DELAY_SECONDS} seconds (works in background too).`);
    } else {
      notify(
        result.reason === 'permission-denied'
          ? 'Notifications are disabled. Enable them in Settings to receive reminders.'
          : 'Could not schedule the test notification.',
      );
    }
  };

  const onEnableReminder = async (): Promise<void> => {
    const result = await rescheduleReminder(task.id);
    notify(describeReminder(result) ?? 'Reminder updated');
  };

  const nowDate = new Date(now);
  const reminder = describeTaskReminder(task, nowDate);
  const overdue = !isClosedStatus(task.status) && Date.parse(task.dueDate) < now;
  const transitions = STATUS_TRANSITIONS[task.status];
  const coordinates = task.location.coordinates;
  const muted = theme.colors.onSurfaceVariant;

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hero}>
          <Text variant="headlineSmall" style={styles.title} selectable>
            {task.title}
          </Text>
          <View style={styles.badges}>
            <StatusChip status={task.status} size="medium" />
            <SyncStatusBadge status={task.syncStatus} />
          </View>
          {task.syncStatus === 'failed' && task.syncError ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {task.syncError}
            </Text>
          ) : null}
        </View>

        <SectionCard title="Update status" icon="swap-horizontal">
          <View style={styles.actions}>
            {transitions.map((to) => {
              const forward = to === 'in_progress' || to === 'completed';
              return (
                <Button
                  key={to}
                  mode={forward ? 'contained' : 'outlined'}
                  icon={STATUS_ICONS[to]}
                  loading={busyStatus === to}
                  disabled={busyStatus !== null}
                  textColor={to === 'cancelled' ? theme.colors.error : undefined}
                  buttonColor={forward ? theme.custom.status[to] : undefined}
                  onPress={() => (to === 'cancelled' ? setConfirmCancel(true) : void applyStatus(to))}
                >
                  {STATUS_ACTION_LABELS[to]}
                </Button>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard title="Description" icon="text-box-outline">
          <Text variant="bodyMedium" selectable style={styles.body}>
            {task.description}
          </Text>
        </SectionCard>

        <SectionCard title="Schedule & reminder" icon="calendar-clock">
          <View>
            <Text variant="titleMedium" style={overdue ? { color: theme.colors.error } : undefined}>
              {formatDateTime(task.dueDate)}
            </Text>
            <Text variant="bodySmall" style={{ color: overdue ? theme.colors.error : muted }}>
              {overdue
                ? `Overdue — was due ${formatRelative(task.dueDate, nowDate)}`
                : `Due ${formatRelative(task.dueDate, nowDate)}`}
            </Text>
          </View>
          <View style={styles.inline}>
            <IconButton
              icon={reminder.active ? 'bell-ring-outline' : 'bell-off-outline'}
              size={18}
              style={styles.inlineIcon}
              iconColor={reminder.active ? theme.colors.primary : muted}
            />
            <Text variant="bodySmall" style={[styles.flex, { color: muted }]}>
              {reminder.text}
            </Text>
          </View>
          <View style={styles.actions}>
            {!reminder.active && !isClosedStatus(task.status) && !overdue ? (
              <Button compact mode="outlined" icon="bell-plus-outline" onPress={onEnableReminder}>
                Enable reminder
              </Button>
            ) : null}
            <Button
              compact
              mode="contained-tonal"
              icon="bell-ring-outline"
              loading={testScheduling}
              disabled={testScheduling}
              onPress={onTestNotification}
            >
              Trigger Test Notification (30s)
            </Button>
          </View>
        </SectionCard>

        <SectionCard title="Location" icon="map-marker-outline">
          <Text variant="bodyLarge" selectable>
            {task.location.address}
          </Text>
          {coordinates ? (
            <>
              <Text variant="bodySmall" style={{ color: muted }} selectable>
                {formatCoordinate(coordinates.latitude)}, {formatCoordinate(coordinates.longitude)}
              </Text>
              <TaskLocationPreview
                coordinates={coordinates}
                status={task.status}
                onPress={() => navigation.navigate('MainTabs', { screen: 'Map', params: { focusTaskId: task.id } })}
              />
            </>
          ) : (
            <Text variant="bodySmall" style={{ color: muted }}>
              No coordinates — edit the task to pick a point on the map so it appears on the Map tab.
            </Text>
          )}
          <Button
            compact
            mode="text"
            icon="directions"
            style={styles.alignStart}
            onPress={async () => {
              if (!(await openInExternalMaps(task.location, task.title))) notify('No maps application available.');
            }}
          >
            Open in maps app
          </Button>
        </SectionCard>

        <SectionCard title={`Attachments (${task.attachments.length})`} icon="paperclip">
          {task.attachments.length > 0 ? (
            <View style={styles.grid}>
              {task.attachments.map((attachment) => (
                <AttachmentTile key={attachment.id} attachment={attachment} size={96} onPress={setViewer} />
              ))}
            </View>
          ) : (
            <Text variant="bodySmall" style={{ color: muted }}>
              No attachments.
            </Text>
          )}
        </SectionCard>

        <SectionCard title="Status history" icon="timeline-clock-outline">
          <StatusTimeline history={task.statusHistory} />
        </SectionCard>

        <SectionCard title="Recent activity" icon="history">
          {activity.length === 0 ? (
            <Text variant="bodySmall" style={{ color: muted }}>
              No activity recorded.
            </Text>
          ) : (
            <View style={styles.activity}>
              {activity.slice(0, ACTIVITY_PREVIEW_COUNT).map((log, index) => (
                <View key={log.id}>
                  {index > 0 ? <Divider /> : null}
                  <HistoryLogItem log={log} />
                </View>
              ))}
            </View>
          )}
        </SectionCard>

        <SectionCard title="Details" icon="information-outline">
          <MetaRow label="Created" value={formatDateTime(task.createdAt)} />
          <MetaRow label="Last updated" value={formatDateTime(task.updatedAt)} />
          <MetaRow label="Last synced" value={task.lastSyncedAt ? formatDateTime(task.lastSyncedAt) : 'Never'} />
          <MetaRow label="Task ID" value={task.id} />
        </SectionCard>

        <CandidateFooter />
      </ScrollView>

      <AttachmentViewerModal attachment={viewer} onDismiss={() => setViewer(null)} />
      <ConfirmDialog
        visible={confirmDelete}
        icon="trash-can-outline"
        title="Delete task?"
        message="The task and its attachments will be removed from this device, and from the server on the next sync."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
        onDismiss={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        visible={confirmCancel}
        icon="cancel"
        title="Cancel this task?"
        message="The task will be marked as Cancelled and its reminder removed. You can restore it later."
        confirmLabel="Cancel task"
        cancelLabel="Keep"
        destructive
        onConfirm={() => {
          setConfirmCancel(false);
          void applyStatus('cancelled');
        }}
        onDismiss={() => setConfirmCancel(false)}
      />
    </>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.metaRow}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Text variant="bodySmall" selectable style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  hero: {
    gap: 10,
    paddingVertical: 4,
  },
  title: {
    fontWeight: '700',
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  body: {
    lineHeight: 22,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineIcon: {
    margin: 0,
    marginLeft: -8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  activity: {
    marginHorizontal: -16,
  },
  alignStart: {
    alignSelf: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  metaValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
