import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { APP_NAME, CANDIDATE_CODE } from '../utils/constants';

export function LoadingScreen() {
  const theme = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" />
      <Text variant="titleMedium">{APP_NAME}</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Candidate Code: {CANDIDATE_CODE}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
