import { Camera, Map, Marker, NativeUserLocation, type CameraRef, type LngLat } from '@maplibre/maplibre-react-native';
import { useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';

import { useAppTheme } from '../../theme';
import { OPEN_FREE_MAP_STYLES } from '../../theme/mapStyles';
import type { GeoCoordinates } from '../../types';
import type { MapCanvasProps } from './types';

const PIN_SIZE = 40;

/** A map press this soon after a pin press belongs to the same tap. */
const PIN_PRESS_ECHO_MS = 300;

const toLngLat = ({ latitude, longitude }: GeoCoordinates): LngLat => [longitude, latitude];

/** Web-mercator zoom level that shows roughly `span` degrees of longitude. */
const spanToZoom = (span: number): number => Math.log2(360 / span);

/**
 * MapLibre renderer with free OpenFreeMap vector tiles, used by Android builds made without a
 * Google Maps API key. Pins cannot be dragged; the picker moves the pin on map taps instead.
 */
export function MapLibreCanvas({
  ref,
  initialCenter,
  initialSpan,
  pins,
  preview = false,
  showsUserLocation = false,
  onReady,
  onPress,
  onPinPress,
}: MapCanvasProps) {
  const theme = useAppTheme();
  const cameraRef = useRef<CameraRef>(null);
  const lastPinPressAt = useRef(0);

  useImperativeHandle(
    ref,
    () => ({
      moveTo: (coordinates, span, durationMs) =>
        cameraRef.current?.easeTo({ center: toLngLat(coordinates), zoom: spanToZoom(span), duration: durationMs }),
      fitTo: (points, padding) => {
        const longitudes = points.map((point) => point.longitude);
        const latitudes = points.map((point) => point.latitude);
        cameraRef.current?.fitBounds(
          [Math.min(...longitudes), Math.min(...latitudes), Math.max(...longitudes), Math.max(...latitudes)],
          { padding, duration: 500 },
        );
      },
    }),
    [],
  );

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={theme.dark ? OPEN_FREE_MAP_STYLES.dark : OPEN_FREE_MAP_STYLES.light}
      dragPan={!preview}
      touchZoom={!preview}
      doubleTapZoom={!preview}
      doubleTapHoldZoom={!preview}
      touchRotate={!preview}
      touchPitch={!preview}
      logo={false}
      attributionPosition={{ bottom: 8, left: 8 }}
      onDidFinishLoadingMap={() => onReady?.()}
      onPress={(event) => {
        // On Android a pin tap also reaches the map right after the pin's own onPress.
        if (Date.now() - lastPinPressAt.current < PIN_PRESS_ECHO_MS) return;
        const [longitude, latitude] = event.nativeEvent.lngLat;
        onPress?.({ latitude, longitude });
      }}
    >
      <Camera
        ref={cameraRef}
        initialViewState={{ center: toLngLat(initialCenter), zoom: spanToZoom(initialSpan) }}
      />
      {showsUserLocation ? <NativeUserLocation /> : null}
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          id={pin.id}
          lngLat={toLngLat(pin.coordinates)}
          anchor="bottom"
          onPress={() => {
            lastPinPressAt.current = Date.now();
            onPinPress?.(pin.id);
          }}
        >
          <Icon source="map-marker" size={PIN_SIZE} color={pin.color} />
        </Marker>
      ))}
    </Map>
  );
}
