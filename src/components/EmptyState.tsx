import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Button, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({ icon, title, message, actionLabel, actionIcon, onAction, children }: EmptyStateProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <Avatar.Icon
        icon={icon}
        size={88}
        color={theme.colors.primary}
        style={{ backgroundColor: theme.colors.primaryContainer }}
      />
      <Text variant="titleLarge" style={styles.title}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button mode="contained" icon={actionIcon} onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 12,
  },
  title: {
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: 8,
  },
});
