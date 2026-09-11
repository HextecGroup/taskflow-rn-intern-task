import { useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, FAB, IconButton, Surface, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCurrentCoordinates, reverseGeocode } from '../services/locationService';
import { useAppTheme } from '../theme';
import type { GeoCoordinates } from '../types';
import { DEFAULT_MAP_CENTER } from '../utils/constants';
import { formatCoordinate } from '../utils/validation';
import { MapCanvas, type MapCanvasHandle } from './map/MapCanvas';

export interface PickedLocation {
  coordinates: GeoCoordinates;
  /** Reverse-geocoded address suggestion, when available. */
  address: string | null;
}

interface LocationPickerModalProps {
  visible: boolean;
  initialCoordinates: GeoCoordinates | null;
  onDismiss: () => void;
  onConfirm: (location: PickedLocation) => void;
}

const SPAN = 0.03;

export function LocationPickerModal({ visible, initialCoordinates, onDismiss, onConfirm }: LocationPickerModalProps) {
  const theme = useAppTheme();
  const mapRef = useRef<MapCanvasHandle>(null);
  const [selected, setSelected] = useState<GeoCoordinates | null>(initialCoordinates);
  const [busy, setBusy] = useState<'locating' | 'resolving' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // State is initialised from props on mount; the parent passes a new `key` for every opening.
  const center = initialCoordinates ?? DEFAULT_MAP_CENTER;

  const locateMe = async (): Promise<void> => {
    setBusy('locating');
    setMessage(null);
    const result = await getCurrentCoordinates();
    setBusy(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setSelected(result.value);
    mapRef.current?.moveTo(result.value, SPAN, 400);
  };

  const confirm = async (): Promise<void> => {
    if (!selected) return;
    setBusy('resolving');
    const address = await reverseGeocode(selected);
    setBusy(null);
    onConfirm({ coordinates: selected, address: address.ok ? address.value : null });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDismiss} presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <IconButton icon="close" onPress={onDismiss} accessibilityLabel="Close location picker" />
          <View style={styles.headerText}>
            <Text variant="titleMedium">Pick location</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Tap the map to place the pin
            </Text>
          </View>
        </View>

        <View style={styles.mapWrapper}>
          <MapCanvas
            ref={mapRef}
            initialCenter={center}
            initialSpan={SPAN}
            pins={selected ? [{ id: 'selected', coordinates: selected, color: theme.colors.primary, draggable: true }] : []}
            showsUserLocation
            onPress={setSelected}
            onPinDragEnd={(_id, coordinates) => setSelected(coordinates)}
          />
          <FAB
            icon="crosshairs-gps"
            size="small"
            style={styles.locateFab}
            onPress={locateMe}
            loading={busy === 'locating'}
            accessibilityLabel="Use my current location"
          />
        </View>

        <Surface elevation={2} style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Selected coordinates
          </Text>
          <Text variant="titleMedium">
            {selected
              ? `${formatCoordinate(selected.latitude)}, ${formatCoordinate(selected.longitude)}`
              : 'Nothing selected yet'}
          </Text>
          {message ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {message}
            </Text>
          ) : null}
          <View style={styles.sheetActions}>
            <Button mode="text" onPress={onDismiss}>
              Cancel
            </Button>
            <Button
              mode="contained"
              icon="check"
              disabled={!selected || busy !== null}
              onPress={confirm}
            >
              {busy === 'resolving' ? 'Resolving address…' : 'Use this location'}
            </Button>
          </View>
          {busy === 'resolving' ? <ActivityIndicator style={styles.spinner} /> : null}
        </Surface>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  headerText: {
    flex: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  locateFab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  sheet: {
    padding: 16,
    gap: 4,
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  spinner: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});
