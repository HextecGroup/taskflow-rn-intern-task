import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, type PersistStorage } from 'zustand/middleware';

import { STORAGE_KEYS } from '../utils/constants';

/**
 * AsyncStorage-backed JSON storage used by every persisted Zustand store.
 * Keeping the adapter in one place makes swapping to MMKV a one-line change.
 */
export function createPersistStorage<T>(): PersistStorage<T> | undefined {
  return createJSONStorage<T>(() => AsyncStorage);
}

export async function clearPersistedState(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
}
