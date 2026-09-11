import type { Ref } from 'react';

import type { GeoCoordinates } from '../../types';

export interface MapPin {
  id: string;
  coordinates: GeoCoordinates;
  color: string;
  /** Callout text (react-native-maps only). */
  title?: string;
  description?: string;
  /** react-native-maps only; with MapLibre the user taps the map to move the pin. */
  draggable?: boolean;
}

export interface MapPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Imperative camera controls shared by both map renderers. */
export interface MapCanvasHandle {
  /** Centres the camera on a point; `span` is the visible latitude/longitude span in degrees. */
  moveTo(coordinates: GeoCoordinates, span: number, durationMs: number): void;
  /** Frames at least two points, keeping `padding` free around them. */
  fitTo(points: GeoCoordinates[], padding: MapPadding): void;
}

export interface MapCanvasProps {
  initialCenter: GeoCoordinates;
  /** Initially visible latitude/longitude span in degrees. */
  initialSpan: number;
  pins: MapPin[];
  /** Small non-interactive map (task details). */
  preview?: boolean;
  showsUserLocation?: boolean;
  onReady?: () => void;
  /** Press on the map itself, not on a pin. */
  onPress?: (coordinates: GeoCoordinates) => void;
  onPinPress?: (id: string) => void;
  onPinCalloutPress?: (id: string) => void;
  onPinDragEnd?: (id: string, coordinates: GeoCoordinates) => void;
  ref?: Ref<MapCanvasHandle>;
}
