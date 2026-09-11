import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { Avatar, Button, Divider, HelperText, List, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';

import { CandidateBadge, CandidateFooter } from '../components/CandidateFooter';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SectionCard } from '../components/SectionCard';
import { useNotificationPermission } from '../hooks/useNotificationSetup';
import { useSyncCounts } from '../hooks/useTasks';
import type { MainTabScreenProps } from '../navigation/types';
import { seedDemoTasks } from '../services/demoData';
import { getScheduledNotificationCount, scheduleTestNotification } from '../services/notificationService';
import { getAutoServerUrl, useServerUrl } from '../services/serverConfig';
import { describeSummary, describeSyncOutcome, syncNow, testServerConnection } from '../services/syncService';
import { resetAllData } from '../services/taskService';
import { useHistoryStore } from '../store/historyStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSyncStore } from '../store/syncStore';
import { notify } from '../store/uiStore';
import { useAppTheme } from '../theme';
import type { ThemePreference } from '../types';
import { APP_NAME, CANDIDATE_CODE, REMINDER_LEAD_MINUTES, TEST_NOTIFICATION_DELAY_SECONDS } from '../utils/constants';
import { formatDateTime, formatRelative } from '../utils/date';
import { pluralize } from '../utils/format';
import { isValidServerUrl, normalizeServerUrl } from '../utils/validation';

type PendingConfirm = 'clear-history' | 'reset' | null;

const PERMISSION_LABELS = {
  granted: 'Allowed',
  denied: 'Blocked — enable in system settings',
  undetermined: 'Not requested yet',
} as const;

export function SettingsScreen(_props: MainTabScreenProps<'Settings'>) {
  const theme = useAppTheme();

  // Appearance
  const themePreference = useSettingsStore((state) => state.themePreference);
  const setThemePreference = useSettingsStore((state) => state.setThemePreference);

  // Sync
  const serverOverride = useSettingsStore((state) => state.serverUrl);
  const setServerUrl = useSettingsStore((state) => state.setServerUrl);
  const autoSync = useSettingsStore((state) => state.autoSync);
  const setAutoSync = useSettingsStore((state) => state.setAutoSync);
  const effectiveServerUrl = useServerUrl();
  const isOnline = useSyncStore((state) => state.isOnline);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const lastSyncAt = useSyncStore((state) => state.lastSyncAt);
  const lastError = useSyncStore((state) => state.lastError);
  const lastSummary = useSyncStore((state) => state.lastSummary);
  const { pending, failed } = useSyncCounts();
  const [serverDraft, setServerDraft] = useState(serverOverride ?? '');
  const [testing, setTesting] = useState(false);

  // Notifications
  const permission = useNotificationPermission();
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);
  const [testScheduling, setTestScheduling] = useState(false);

  // Data
  const clearHistory = useHistoryStore((state) => state.clear);
  const [confirm, setConfirm] = useState<PendingConfirm>(null);
  const [seeding, setSeeding] = useState(false);

  const refreshScheduled = useCallback(() => {
    void getScheduledNotificationCount().then(setScheduledCount);
  }, []);

  useFocusEffect(refreshScheduled);

  const draftValid = serverDraft.trim() === '' || isValidServerUrl(serverDraft);

  const saveServerUrl = (): void => {
    if (!draftValid) return;
    const value = serverDraft.trim() ? normalizeServerUrl(serverDraft) : null;
    setServerUrl(value);
    setServerDraft(value ?? '');
    notify(value ? `Server URL saved: ${value}` : 'Using auto-detected server URL');
  };

  const testConnection = async (): Promise<void> => {
    const url = serverDraft.trim() && draftValid ? normalizeServerUrl(serverDraft) : effectiveServerUrl;
    setTesting(true);
    const result = await testServerConnection(url);
    setTesting(false);
    notify(result.ok ? `Connected to ${url} (${result.latencyMs} ms)` : `Cannot reach ${url}: ${result.error}`);
  };

  const runSync = async (): Promise<void> => {
    notify(describeSyncOutcome(await syncNow()));
  };

  const triggerTestNotification = async (): Promise<void> => {
    setTestScheduling(true);
    const result = await scheduleTestNotification();
    setTestScheduling(false);
    await permission.refresh();
    refreshScheduled();
    if (result.ok) {
      notify(
        `Test notification scheduled — it fires in ${TEST_NOTIFICATION_DELAY_SECONDS} seconds. Try locking the screen or backgrounding the app.`,
      );
    } else if (result.reason === 'permission-denied') {
      notify('Notifications are blocked for this app.', { label: 'Open settings', onPress: () => void Linking.openSettings() });
    } else {
      notify('Could not schedule the test notification.');
    }
  };

  const onSeed = async (): Promise<void> => {
    setSeeding(true);
    try {
      const count = await seedDemoTasks();
      refreshScheduled();
      notify(`${pluralize(count, 'demo task')} added — one is due in 31 min, so its reminder fires in ~1 min`);
    } finally {
      setSeeding(false);
    }
  };

  const onConfirm = async (): Promise<void> => {
    const action = confirm;
    setConfirm(null);
    if (action === 'clear-history') {
      clearHistory();
      notify('History log cleared');
    } else if (action === 'reset') {
      await resetAllData();
      refreshScheduled();
      notify('All local data was reset');
    }
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* About - candidate code is shown prominently at the very top */}
        <SectionCard style={styles.about}>
          <Avatar.Icon icon="clipboard-check-multiple-outline" size={64} style={{ backgroundColor: theme.colors.primary }} color={theme.colors.onPrimary} />
          <Text variant="headlineSmall" style={styles.bold}>
            {APP_NAME}
          </Text>
          <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
            SalesAutomators · Mobile React Native Intern technical task
          </Text>
          <CandidateBadge size="large" />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Version {version} · Expo SDK 57 · React Native · TypeScript
          </Text>
        </SectionCard>

        <SectionCard title="Appearance" icon="palette-outline">
          <SegmentedButtons
            value={themePreference}
            onValueChange={(value) => setThemePreference(value as ThemePreference)}
            buttons={[
              { value: 'system', label: 'System', icon: 'theme-light-dark' },
              { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
              { value: 'dark', label: 'Dark', icon: 'weather-night' },
            ]}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            The sun/moon button in every screen header toggles Light/Dark instantly.
          </Text>
        </SectionCard>

        <SectionCard title="Sync & server" icon="cloud-sync-outline">
          <List.Item
            style={styles.listItem}
            title={isOnline === false ? 'Offline' : 'Online'}
            description={
              isOnline === false ? 'Changes are stored locally and synced when connectivity returns.' : 'Network connection detected.'
            }
            left={(props) => (
              <List.Icon
                {...props}
                icon={isOnline === false ? 'wifi-off' : 'wifi'}
                color={isOnline === false ? theme.custom.warning : theme.custom.success}
              />
            )}
          />
          <List.Item
            style={styles.listItem}
            title={lastSyncAt ? `Last sync ${formatRelative(lastSyncAt)}` : 'Never synced'}
            description={
              [
                lastSyncAt ? formatDateTime(lastSyncAt) : null,
                lastSummary ? describeSummary(lastSummary) : null,
                `${pluralize(pending, 'pending change')}, ${pluralize(failed, 'failed task')}`,
              ]
                .filter(Boolean)
                .join('\n')
            }
            descriptionNumberOfLines={4}
            left={(props) => <List.Icon {...props} icon="history" />}
          />
          {lastError ? (
            <HelperText type="error" visible>
              Last error: {lastError}
            </HelperText>
          ) : null}

          <View>
            <TextInput
              mode="outlined"
              label="json-server URL"
              value={serverDraft}
              onChangeText={setServerDraft}
              placeholder={getAutoServerUrl()}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              error={!draftValid}
              left={<TextInput.Icon icon="server-network" />}
            />
            <HelperText type={draftValid ? 'info' : 'error'} visible>
              {draftValid
                ? `In use: ${effectiveServerUrl}${serverOverride ? '' : ' (auto-detected)'}. Leave empty for auto.`
                : 'Enter a valid URL, e.g. http://192.168.1.10:3000'}
            </HelperText>
          </View>
          <View style={styles.row}>
            <Button compact mode="outlined" icon="content-save-outline" disabled={!draftValid} onPress={saveServerUrl}>
              Save URL
            </Button>
            <Button compact mode="outlined" icon="lan-connect" loading={testing} disabled={testing} onPress={testConnection}>
              Test connection
            </Button>
          </View>

          <Divider />
          <List.Item
            style={styles.listItem}
            title="Automatic sync"
            description="After every change, on reconnect and when the app returns to the foreground"
            descriptionNumberOfLines={2}
            left={(props) => <List.Icon {...props} icon="sync" />}
            right={() => <Switch value={autoSync} onValueChange={setAutoSync} />}
          />
          <Button mode="contained" icon="cloud-sync" loading={isSyncing} disabled={isSyncing} onPress={runSync}>
            Sync now
          </Button>
        </SectionCard>

        <SectionCard title="Notifications" icon="bell-outline">
          <List.Item
            style={styles.listItem}
            title="Permission"
            description={permission.state ? PERMISSION_LABELS[permission.state] : 'Checking…'}
            left={(props) => (
              <List.Icon
                {...props}
                icon={permission.state === 'granted' ? 'bell-check-outline' : 'bell-off-outline'}
                color={permission.state === 'granted' ? theme.custom.success : theme.custom.warning}
              />
            )}
            right={() =>
              permission.state === 'undetermined' ? (
                <Button compact onPress={() => void permission.request()}>
                  Allow
                </Button>
              ) : permission.state === 'denied' ? (
                <Button compact onPress={() => void Linking.openSettings()}>
                  Settings
                </Button>
              ) : null
            }
          />
          <List.Item
            style={styles.listItem}
            title={scheduledCount === null ? 'Scheduled notifications' : pluralize(scheduledCount, 'scheduled notification')}
            description={`Task reminders fire ${REMINDER_LEAD_MINUTES} minutes before the due time.`}
            left={(props) => <List.Icon {...props} icon="calendar-clock" />}
          />
          <Button
            mode="contained"
            icon="bell-ring-outline"
            loading={testScheduling}
            disabled={testScheduling}
            onPress={triggerTestNotification}
            buttonColor={theme.colors.tertiary}
          >
            Trigger Test Notification (30s)
          </Button>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Demo helper: schedules a real local notification {TEST_NOTIFICATION_DELAY_SECONDS} seconds from now.
          </Text>
        </SectionCard>

        <SectionCard title="Data & demo" icon="database-outline">
          <Button mode="outlined" icon="database-plus-outline" loading={seeding} disabled={seeding} onPress={onSeed}>
            Load demo tasks
          </Button>
          <Button mode="outlined" icon="delete-sweep-outline" onPress={() => setConfirm('clear-history')}>
            Clear activity history
          </Button>
          <Button mode="outlined" icon="restore-alert" textColor={theme.colors.error} onPress={() => setConfirm('reset')}>
            Reset all local data
          </Button>
        </SectionCard>

        <CandidateFooter />
        <Text variant="labelSmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
          Candidate Code: {CANDIDATE_CODE}
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={confirm !== null}
        icon={confirm === 'reset' ? 'restore-alert' : 'delete-sweep-outline'}
        title={confirm === 'reset' ? 'Reset all local data?' : 'Clear activity history?'}
        message={
          confirm === 'reset'
            ? 'Deletes every task, attachment, scheduled reminder and history entry on this device. Settings are kept. Data already on the server is not deleted and will be pulled again on the next sync.'
            : 'All activity entries will be removed. Tasks are not affected.'
        }
        confirmLabel={confirm === 'reset' ? 'Reset' : 'Clear'}
        destructive
        onConfirm={() => void onConfirm()}
        onDismiss={() => setConfirm(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  about: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  bold: {
    fontWeight: '700',
  },
  center: {
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
});
