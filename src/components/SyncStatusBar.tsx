import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Icon, Text } from 'react-native-paper';

import { useSyncCounts } from '../hooks/useTasks';
import { syncNow } from '../services/syncService';
import { useSyncStore } from '../store/syncStore';
import { useAppTheme } from '../theme';
import { withAlpha } from '../theme/colors';
import { pluralize } from '../utils/format';

/**
 * Compact banner summarising connectivity and pending sync work.
 * Hidden when online and everything is synced.
 */
export function SyncStatusBar() {
  const theme = useAppTheme();
  const isOnline = useSyncStore((state) => state.isOnline);
  const isSyncing = useSyncStore((state) => state.isSyncing);
  const lastError = useSyncStore((state) => state.lastError);
  const { pending, failed } = useSyncCounts();

  let icon: string;
  let color: string;
  let message: string;
  let showAction = false;

  if (isOnline === false) {
    icon = 'wifi-off';
    color = theme.custom.warning;
    message =
      pending + failed > 0
        ? `Offline — ${pluralize(pending + failed, 'change')} saved locally, will sync when back online`
        : 'Offline — everything keeps working, changes sync later';
  } else if (isSyncing) {
    icon = 'cloud-sync-outline';
    color = theme.colors.primary;
    message = 'Syncing with server…';
  } else if (failed > 0 || (lastError && pending > 0)) {
    icon = 'cloud-alert';
    color = theme.colors.error;
    message = lastError ? `Sync failed: ${lastError}` : `${pluralize(failed, 'task')} failed to sync`;
    showAction = true;
  } else if (pending > 0) {
    icon = 'cloud-upload-outline';
    color = theme.custom.warning;
    message = `${pluralize(pending, 'change')} pending sync`;
    showAction = true;
  } else {
    return null;
  }

  return (
    <View
      style={[styles.bar, { backgroundColor: withAlpha(color, theme.dark ? 0.16 : 0.1), borderColor: withAlpha(color, 0.3) }]}
      accessibilityLiveRegion="polite"
    >
      {isSyncing ? <ActivityIndicator size={16} color={color} /> : <Icon source={icon} size={18} color={color} />}
      <Text variant="bodySmall" numberOfLines={2} style={[styles.message, { color: theme.colors.onSurface }]}>
        {message}
      </Text>
      {showAction ? (
        <Button compact mode="text" onPress={() => void syncNow()} textColor={color}>
          {failed > 0 ? 'Retry' : 'Sync now'}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingLeft: 12,
    paddingRight: 4,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  message: {
    flex: 1,
    paddingVertical: 8,
  },
});
