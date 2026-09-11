import { StyleSheet } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useUiStore } from '../store/uiStore';

/** Single app-wide snackbar fed by `notify()` from anywhere in the app. */
export function GlobalSnackbar() {
  const snackbar = useUiStore((state) => state.snackbar);
  const hide = useUiStore((state) => state.hideSnackbar);
  const insets = useSafeAreaInsets();

  return (
    <Snackbar
      key={snackbar?.id}
      visible={snackbar !== null}
      onDismiss={hide}
      duration={4000}
      wrapperStyle={[styles.wrapper, { bottom: insets.bottom + 56 }]}
      action={
        snackbar?.actionLabel && snackbar.onAction
          ? { label: snackbar.actionLabel, onPress: snackbar.onAction }
          : { label: 'OK', onPress: hide }
      }
    >
      {snackbar?.message ?? ''}
    </Snackbar>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
});
