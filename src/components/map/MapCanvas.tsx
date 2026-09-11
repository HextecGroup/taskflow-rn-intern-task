import type { ComponentType } from 'react';

import { MAP_PROVIDER } from '../../services/mapAvailability';
import { ReactNativeMapsCanvas } from './ReactNativeMapsCanvas';
import type { MapCanvasProps } from './types';

export type { MapCanvasHandle, MapPin } from './types';

/**
 * Map rendered by the provider chosen for this build (see services/mapAvailability).
 * MapLibre's native module is not part of Expo Go and throws on import there, so it is only
 * required by builds that actually render with it.
 */
export const MapCanvas: ComponentType<MapCanvasProps> =
  MAP_PROVIDER === 'maplibre'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- deferred on purpose, see above
      (require('./MapLibreCanvas') as typeof import('./MapLibreCanvas')).MapLibreCanvas
    : ReactNativeMapsCanvas;
