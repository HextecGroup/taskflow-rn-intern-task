import * as Location from 'expo-location';

import type { GeoCoordinates } from '../types';
import { errorMessage } from '../utils/format';

export type LocationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: 'permission-denied' | 'not-found' | 'error'; message: string };

const permissionDenied = <T>(): LocationResult<T> => ({
  ok: false,
  reason: 'permission-denied',
  message: 'Location permission is required for this action.',
});

async function ensureForegroundPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const result = await Location.requestForegroundPermissionsAsync();
  return result.granted;
}

export async function getCurrentCoordinates(): Promise<LocationResult<GeoCoordinates>> {
  try {
    if (!(await ensureForegroundPermission())) return permissionDenied();
    const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
    const position =
      lastKnown ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { ok: true, value: { latitude: position.coords.latitude, longitude: position.coords.longitude } };
  } catch (error) {
    return { ok: false, reason: 'error', message: errorMessage(error) };
  }
}

/** Address -> coordinates using the platform geocoder. */
export async function geocodeAddress(address: string): Promise<LocationResult<GeoCoordinates>> {
  try {
    if (!(await ensureForegroundPermission())) return permissionDenied();
    const [first] = await Location.geocodeAsync(address);
    if (!first) return { ok: false, reason: 'not-found', message: 'No location found for this address.' };
    return { ok: true, value: { latitude: first.latitude, longitude: first.longitude } };
  } catch (error) {
    return { ok: false, reason: 'error', message: errorMessage(error) };
  }
}

function formatAddress(address: Location.LocationGeocodedAddress): string {
  if (address.formattedAddress) return address.formattedAddress;
  const street = [address.street, address.streetNumber].filter(Boolean).join(' ');
  return [address.name !== street ? address.name : null, street, address.district, address.city, address.country]
    .filter((part): part is string => Boolean(part))
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(', ');
}

/** Coordinates -> human readable address using the platform geocoder. */
export async function reverseGeocode(coordinates: GeoCoordinates): Promise<LocationResult<string>> {
  try {
    if (!(await ensureForegroundPermission())) return permissionDenied();
    const [first] = await Location.reverseGeocodeAsync(coordinates);
    const formatted = first ? formatAddress(first) : '';
    if (!formatted) return { ok: false, reason: 'not-found', message: 'No address found for this point.' };
    return { ok: true, value: formatted };
  } catch (error) {
    return { ok: false, reason: 'error', message: errorMessage(error) };
  }
}
