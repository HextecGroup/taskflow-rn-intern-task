import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon, Surface, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';

interface SectionCardProps {
  title?: string;
  icon?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionCard({ title, icon, right, children, style }: SectionCardProps) {
  const theme = useAppTheme();
  return (
    <Surface
      elevation={0}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }, style]}
    >
      {title ? (
        <View style={styles.header}>
          {icon ? <Icon source={icon} size={18} color={theme.colors.primary} /> : null}
          <Text variant="titleSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
            {title}
          </Text>
          {right}
        </View>
      ) : null}
      {children}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontWeight: '700',
  },
});
