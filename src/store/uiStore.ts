import { create } from 'zustand';

export interface SnackbarMessage {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface UiState {
  snackbar: SnackbarMessage | null;
  showSnackbar: (message: string, action?: { label: string; onPress: () => void }) => void;
  hideSnackbar: () => void;
}

let nextId = 1;

/** Transient UI state (never persisted). */
export const useUiStore = create<UiState>()((set) => ({
  snackbar: null,
  showSnackbar: (message, action) =>
    set({ snackbar: { id: nextId++, message, actionLabel: action?.label, onAction: action?.onPress } }),
  hideSnackbar: () => set({ snackbar: null }),
}));

/** Show a snackbar from anywhere (hooks, services, event handlers). */
export const notify = (message: string, action?: { label: string; onPress: () => void }): void =>
  useUiStore.getState().showSnackbar(message, action);
