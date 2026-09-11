import Constants from 'expo-constants';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { APP_NAME, CANDIDATE_CODE } from '../utils/constants';

interface CandidateBadgeProps {
  size?: 'small' | 'large';
}

/** Highly visible "Candidate Code" pill required by the assignment. */
export function CandidateBadge({ size = 'small' }: CandidateBadgeProps) {
  const theme = useAppTheme();
  const large = size === 'large';
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Candidate Code: ${CANDIDATE_CODE}`}
      style={[
        styles.badge,
        large && styles.badgeLarge,
        { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary },
      ]}
    >
      <Icon source="badge-account-horizontal-outline" size={large ? 22 : 16} color={theme.colors.onPrimaryContainer} />
      <Text
        variant={large ? 'titleMedium' : 'labelLarge'}
        style={[styles.badgeText, { color: theme.colors.onPrimaryContainer }]}
      >
        Candidate Code: {CANDIDATE_CODE}
      </Text>
    </View>
  );
}

export function CandidateFooter() {
  const theme = useAppTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <View style={styles.footer}>
      <CandidateBadge />
      <Text variant="bodySmall" style={[styles.caption, { color: theme.colors.onSurfaceVariant }]}>
        {APP_NAME} v{version} · SalesAutomators — Mobile React Native Intern test task
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  caption: {
    textAlign: 'center',
  },
});
