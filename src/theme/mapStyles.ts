import type { MapStyleElement } from 'react-native-maps';

/** Google Maps "night" style used on Android when the dark theme is active. */
export const darkMapStyle: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2230' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a93a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1d2230' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a4256' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#232a3b' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7d869b' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1c3328' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c3446' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1f2b' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9aa3b8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3b4560' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#262e40' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1624' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e5d78' }] },
];

/** Free OpenFreeMap vector styles (no API key) used by the MapLibre renderer. */
export const OPEN_FREE_MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
} as const;
