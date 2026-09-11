import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, HelperText, Modal, Portal, Text, TextInput } from 'react-native-paper';

import { useAppTheme } from '../theme';
import { addMinutes, combineDateAndTime, formatDateTime, formatRelative, tomorrowAt } from '../utils/date';

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (value: Date) => void;
  onBlur?: () => void;
  error?: string;
  warning?: string;
}

interface Preset {
  label: string;
  build: (now: Date) => Date;
}

const PRESETS: Preset[] = [
  // 31 minutes: the 30-minute reminder fires ~1 minute later - convenient for demos.
  { label: 'In 31 min', build: (now) => addMinutes(now, 31) },
  { label: 'In 2 hours', build: (now) => addMinutes(now, 120) },
  { label: 'Tomorrow 09:00', build: (now) => tomorrowAt(9, now) },
  { label: 'Next week', build: (now) => addMinutes(tomorrowAt(9, now), 6 * 24 * 60) },
];

function defaultPickerValue(value: Date | null): Date {
  if (value) return value;
  const next = addMinutes(new Date(), 60);
  next.setMinutes(0, 0, 0);
  return next;
}

export function DateTimeField({ label, value, onChange, onBlur, error, warning }: DateTimeFieldProps) {
  const theme = useAppTheme();
  const [iosVisible, setIosVisible] = useState(false);
  const [iosDraft, setIosDraft] = useState<Date>(() => defaultPickerValue(value));

  const commit = (date: Date): void => {
    const normalized = new Date(date);
    normalized.setSeconds(0, 0);
    onChange(normalized);
    onBlur?.();
  };

  const openPicker = (): void => {
    const initial = defaultPickerValue(value);
    if (Platform.OS === 'android') {
      // Android has separate native dialogs for the date and the time.
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (dateEvent, pickedDay) => {
          if (dateEvent.type !== 'set' || !pickedDay) {
            onBlur?.();
            return;
          }
          DateTimePickerAndroid.open({
            value: initial,
            mode: 'time',
            is24Hour: true,
            onChange: (timeEvent, pickedTime) => {
              if (timeEvent.type !== 'set' || !pickedTime) {
                onBlur?.();
                return;
              }
              commit(combineDateAndTime(pickedDay, pickedTime));
            },
          });
        },
      });
      return;
    }
    setIosDraft(initial);
    setIosVisible(true);
  };

  const helper = error ?? warning;

  return (
    <View>
      <Pressable onPress={openPicker} accessibilityRole="button" accessibilityLabel={`${label}. ${value ? formatDateTime(value) : 'Not set'}`}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={label}
            value={value ? `${formatDateTime(value)}  (${formatRelative(value)})` : ''}
            placeholder="Select date & time"
            editable={false}
            error={Boolean(error)}
            left={<TextInput.Icon icon="calendar-clock" />}
            right={<TextInput.Icon icon="chevron-down" />}
          />
        </View>
      </Pressable>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets}>
        {PRESETS.map((preset) => (
          <Chip key={preset.label} compact icon="lightning-bolt-outline" onPress={() => commit(preset.build(new Date()))}>
            {preset.label}
          </Chip>
        ))}
      </ScrollView>

      {helper ? (
        <HelperText
          type={error ? 'error' : 'info'}
          visible
          style={!error ? { color: theme.custom.warning } : undefined}
        >
          {helper}
        </HelperText>
      ) : null}

      {Platform.OS === 'ios' ? (
        <Portal>
          <Modal
            visible={iosVisible}
            onDismiss={() => setIosVisible(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
          >
            <Text variant="titleMedium" style={styles.modalTitle}>
              {label}
            </Text>
            <DateTimePicker
              value={iosDraft}
              mode="datetime"
              display="inline"
              minimumDate={new Date()}
              themeVariant={theme.dark ? 'dark' : 'light'}
              accentColor={theme.colors.primary}
              onChange={(_, date) => date && setIosDraft(date)}
            />
            <View style={styles.modalActions}>
              <Button
                onPress={() => {
                  setIosVisible(false);
                  onBlur?.();
                }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setIosVisible(false);
                  commit(iosDraft);
                }}
              >
                Done
              </Button>
            </View>
          </Modal>
        </Portal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  presets: {
    gap: 8,
    paddingTop: 8,
  },
  modal: {
    margin: 20,
    padding: 16,
    borderRadius: 20,
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
