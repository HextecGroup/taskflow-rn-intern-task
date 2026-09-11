import { Linking, Platform } from 'react-native';

import type { TaskLocation } from '../types';

/** Opens the location in the platform maps app, falling back to Google Maps on the web. */
export async function openInExternalMaps(location: TaskLocation, label: string): Promise<boolean> {
  const coords = location.coordinates;
  const point = coords ? `${coords.latitude},${coords.longitude}` : null;
  const query = encodeURIComponent(point ?? location.address);

  const nativeUrl =
    Platform.OS === 'ios'
      ? point
        ? `http://maps.apple.com/?ll=${point}&q=${encodeURIComponent(label)}`
        : `http://maps.apple.com/?q=${query}`
      : point
        ? `geo:${point}?q=${point}(${encodeURIComponent(label)})`
        : `geo:0,0?q=${query}`;

  try {
    await Linking.openURL(nativeUrl);
    return true;
  } catch {
    try {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      return true;
    } catch {
      return false;
    }
  }
}
