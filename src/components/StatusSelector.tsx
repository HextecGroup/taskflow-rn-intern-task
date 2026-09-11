import { StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { withAlpha } from '../theme/colors';
import type { TaskStatus } from '../types';
import { STATUS_ICONS, STATUS_LABELS } from '../utils/status';

interface StatusSelectorProps {
  value: TaskStatus;
  options: readonly TaskStatus[];
  onChange: (status: TaskStatus) => void;
}

export function StatusSelector({ value, options, onChange }: StatusSelectorProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {options.map((status) => {
        const selected = status === value;
        const color = theme.custom.status[status];
        return (
          <Chip
            key={status}
            icon={STATUS_ICONS[status]}
            selected={selected}
            showSelectedCheck={false}
            onPress={() => onChange(status)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={[
              styles.chip,
              selected && { backgroundColor: withAlpha(color, theme.dark ? 0.28 : 0.16), borderColor: color },
            ]}
            textStyle={selected ? { color, fontWeight: '700' } : undefined}
            mode="outlined"
            selectedColor={selected ? color : undefined}
          >
            {STATUS_LABELS[status]}
          </Chip>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
  },
});
