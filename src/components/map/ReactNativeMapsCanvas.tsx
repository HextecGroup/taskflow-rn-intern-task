import { useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { useAppTheme } from '../../theme';
import { darkMapStyle } from '../../theme/mapStyles';
import type { MapCanvasProps } from './types';

/** Google Maps (Android) / Apple Maps (iOS) renderer. */
export function ReactNativeMapsCanvas({
  ref,
  initialCenter,
  initialSpan,
  pins,
  preview = false,
  showsUserLocation = false,
  onReady,
  onPress,
  onPinPress,
  onPinCalloutPress,
  onPinDragEnd,
}: MapCanvasProps) {
  const theme = useAppTheme();
  const mapRef = useRef<MapView>(null);

  useImperativeHandle(
    ref,
    () => ({
      moveTo: (coordinates, span, durationMs) =>
        mapRef.current?.animateToRegion({ ...coordinates, latitudeDelta: span, longitudeDelta: span }, durationMs),
      fitTo: (points, padding) => mapRef.current?.fitToCoordinates(points, { edgePadding: padding, animated: true }),
    }),
    [],
  );

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      liteMode={preview}
      initialRegion={{ ...initialCenter, latitudeDelta: initialSpan, longitudeDelta: initialSpan }}
      scrollEnabled={!preview}
      zoomEnabled={!preview}
      rotateEnabled={!preview}
      pitchEnabled={!preview}
      onMapReady={onReady}
      onPress={(event) => {
        // Android reports marker taps to the map as well.
        if ((event.nativeEvent as { action?: string }).action === 'marker-press') return;
        onPress?.(event.nativeEvent.coordinate);
      }}
      customMapStyle={Platform.OS === 'android' && theme.dark ? darkMapStyle : undefined}
      userInterfaceStyle={theme.dark ? 'dark' : 'light'}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      toolbarEnabled={false}
    >
      {pins.map((pin) => (
        <Marker
          // pinColor is not updated in place on Android, so a colour change remounts the marker.
          key={`${pin.id}-${pin.color}`}
          identifier={pin.id}
          coordinate={pin.coordinates}
          title={pin.title}
          description={pin.description}
          pinColor={pin.color}
          draggable={pin.draggable}
          onPress={() => onPinPress?.(pin.id)}
          onCalloutPress={() => onPinCalloutPress?.(pin.id)}
          onDragEnd={(event) => onPinDragEnd?.(pin.id, event.nativeEvent.coordinate)}
        />
      ))}
    </MapView>
  );
}
