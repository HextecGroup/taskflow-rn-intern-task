import { Button, Dialog, Portal, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon,
  destructive = false,
  onConfirm,
  onDismiss,
}: ConfirmDialogProps) {
  const theme = useAppTheme();
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        {icon ? <Dialog.Icon icon={icon} color={destructive ? theme.colors.error : undefined} /> : null}
        <Dialog.Title style={icon ? { textAlign: 'center' } : undefined}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>{cancelLabel}</Button>
          <Button
            mode={destructive ? 'contained' : 'text'}
            buttonColor={destructive ? theme.colors.error : undefined}
            textColor={destructive ? theme.colors.onError : undefined}
            onPress={onConfirm}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
