import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, Surface, Text } from 'react-native-paper';

import { TaskCard } from '../components/TaskCard';
import { MapCanvas, type MapCanvasHandle, type MapPin } from '../components/map/MapCanvas';
import { useNow } from '../hooks/useNow';
import { useVisibleTasks } from '../hooks/useTasks';
import type { MainTabScreenProps } from '../navigation/types';
import { getCurrentCoordinates } from '../services/locationService';
import { notify } from '../store/uiStore';
import { useAppTheme } from '../theme';
import type { GeoCoordinates, Task } from '../types';
import { TASK_STATUSES } from '../types';
import { DEFAULT_MAP_CENTER } from '../utils/constants';
import { formatShortDateTime } from '../utils/date';
import { pluralize } from '../utils/format';
import { STATUS_LABELS } from '../utils/status';

type MappedTask = Task & { location: Task['location'] & { coordinates: GeoCoordinates } };

const isMapped = (task: Task): task is MappedTask => task.location.coordinates !== null;

const FIT_PADDING = { top: 140, right: 60, bottom: 260, left: 60 };

export function MapScreen({ navigation, route }: MainTabScreenProps<'Map'>) {
  const theme = useAppTheme();
  const tasks = useVisibleTasks();
  const mapRef = useRef<MapCanvasHandle>(null);
  const didInitialFit = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showsUserLocation, setShowsUserLocation] = useState(false);
  const [handledFocusId, setHandledFocusId] = useState<string | undefined>(undefined);
  const now = useNow();

  const mapped = useMemo(() => tasks.filter(isMapped), [tasks]);
  const unmappedCount = tasks.length - mapped.length;
  const focusTaskId = route.params?.focusTaskId;

  const pins = useMemo<MapPin[]>(
    () =>
      mapped.map((task) => ({
        id: task.id,
        coordinates: task.location.coordinates,
        color: theme.custom.status[task.status],
        title: task.title,
        description: `${STATUS_LABELS[task.status]} · ${formatShortDateTime(task.dueDate)} — tap for details`,
      })),
    [mapped, theme],
  );

  // "Open in map" from the details screen selects the task. Derived during render
  // (React's recommended alternative to syncing state inside an effect).
  if (focusTaskId !== handledFocusId) {
    setHandledFocusId(focusTaskId);
    if (focusTaskId) setSelectedId(focusTaskId);
  }
  const selected = mapped.find((task) => task.id === selectedId) ?? null;

  const fitAll = useCallback(() => {
    const map = mapRef.current;
    if (!map || mapped.length === 0) return;
    const [first] = mapped;
    if (mapped.length === 1 && first) {
      map.moveTo(first.location.coordinates, 0.02, 400);
      return;
    }
    map.fitTo(
      mapped.map((task) => task.location.coordinates),
      FIT_PADDING,
    );
  }, [mapped]);

  // Frame all pins the first time the map is ready.
  useEffect(() => {
    if (!mapReady || didInitialFit.current || focusTaskId || mapped.length === 0) return;
    didInitialFit.current = true;
    fitAll();
  }, [mapReady, mapped.length, fitAll, focusTaskId]);

  // ...and moves the camera to it once the map is ready.
  useEffect(() => {
    if (!mapReady || !focusTaskId) return;
    const task = mapped.find((item) => item.id === focusTaskId);
    if (task) {
      didInitialFit.current = true;
      mapRef.current?.moveTo(task.location.coordinates, 0.015, 500);
    }
    navigation.setParams({ focusTaskId: undefined });
  }, [mapReady, focusTaskId, mapped, navigation]);

  const openDetails = useCallback(
    (taskId: string) => navigation.navigate('TaskDetails', { taskId }),
    [navigation],
  );

  const goToMyLocation = async (): Promise<void> => {
    const result = await getCurrentCoordinates();
    if (!result.ok) {
      notify(result.message);
      return;
    }
    setShowsUserLocation(true);
    mapRef.current?.moveTo(result.value, 0.03, 500);
  };

  return (
    <View style={styles.container}>
      <MapCanvas
        ref={mapRef}
        initialCenter={DEFAULT_MAP_CENTER}
        initialSpan={0.12}
        pins={pins}
        showsUserLocation={showsUserLocation}
        onReady={() => setMapReady(true)}
        onPress={() => setSelectedId(null)}
        onPinPress={setSelectedId}
        onPinCalloutPress={openDetails}
      />

      <Surface elevation={2} style={[styles.summary, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.summaryRow}>
          <View style={styles.flex}>
            <Text variant="titleSmall">{pluralize(mapped.length, 'task')} on the map</Text>
            {unmappedCount > 0 ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {pluralize(unmappedCount, 'task')} without coordinates
              </Text>
            ) : null}
          </View>
          <IconButton icon="crosshairs-gps" onPress={goToMyLocation} accessibilityLabel="Show my location" />
          <IconButton
            icon="fit-to-screen-outline"
            disabled={mapped.length === 0}
            onPress={fitAll}
            accessibilityLabel="Show all tasks"
          />
        </View>
        <View style={styles.legend}>
          {TASK_STATUSES.map((status) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.custom.status[status] }]} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {STATUS_LABELS[status]}
              </Text>
            </View>
          ))}
        </View>
      </Surface>

      {selected ? (
        <View style={styles.bottom}>
          <TaskCard task={selected} now={now} onPress={() => openDetails(selected.id)} compact />
          <View style={styles.bottomActions}>
            <Button mode="contained-tonal" icon="close" onPress={() => setSelectedId(null)} compact>
              Close
            </Button>
            <Button mode="contained" icon="open-in-app" onPress={() => openDetails(selected.id)} compact>
              Open details
            </Button>
          </View>
        </View>
      ) : null}

      {mapped.length === 0 ? (
        <Surface elevation={2} style={[styles.bottom, styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
          <Icon source="map-marker-off-outline" size={32} color={theme.colors.primary} />
          <Text variant="titleSmall">No tasks with coordinates yet</Text>
          <Text variant="bodySmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
            Use “Pick on map” or “From address” when creating a task to place it here.
          </Text>
          <Button mode="contained" icon="plus" onPress={() => navigation.navigate('TaskForm')}>
            New task
          </Button>
        </Surface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  summary: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 8,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  bottom: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    gap: 8,
  },
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
});
