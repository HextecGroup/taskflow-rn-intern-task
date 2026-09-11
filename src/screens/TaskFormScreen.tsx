import { usePreventRemove, type NavigationAction } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, HelperText, IconButton, Text, TextInput } from 'react-native-paper';

import { AttachmentEditor } from '../components/AttachmentEditor';
import { AttachmentViewerModal } from '../components/AttachmentViewerModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateTimeField } from '../components/DateTimeField';
import { EmptyState } from '../components/EmptyState';
import { LocationPickerModal, type PickedLocation } from '../components/LocationPickerModal';
import { SectionCard } from '../components/SectionCard';
import { StatusSelector } from '../components/StatusSelector';
import { useTaskForm } from '../hooks/useTaskForm';
import type { RootStackScreenProps } from '../navigation/types';
import { geocodeAddress, getCurrentCoordinates, reverseGeocode } from '../services/locationService';
import { notify } from '../store/uiStore';
import { useAppTheme } from '../theme';
import type { Attachment } from '../types';
import { DESCRIPTION_MAX_LENGTH, REMINDER_LEAD_MINUTES, TITLE_MAX_LENGTH } from '../utils/constants';
import { pluralize } from '../utils/format';
import { describeReminder } from '../utils/reminderMessage';
import { parseCoordinates } from '../utils/validation';

const COORDINATE_KEYBOARD = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric';

export function TaskFormScreen({ route, navigation }: RootStackScreenProps<'TaskForm'>) {
  const taskId = route.params?.taskId;
  const form = useTaskForm(taskId);
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);

  const [pickerVisible, setPickerVisible] = useState(false);
  // Bumped on every open so the picker remounts with fresh state (no reset-in-effect needed).
  const [pickerSession, setPickerSession] = useState(0);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const [locating, setLocating] = useState<'current' | 'address' | null>(null);
  const [discardAction, setDiscardAction] = useState<NavigationAction | null>(null);

  const { values, errors, setField, touch } = form;
  const coordinates = parseCoordinates(values.latitude, values.longitude);

  // Guard against losing unsaved edits (back button, swipe down, header close).
  usePreventRemove(form.isDirty && !form.isSaved, ({ data }) => setDiscardAction(data.action));

  useEffect(() => {
    if (form.isSaved) navigation.goBack();
  }, [form.isSaved, navigation]);

  const save = async (): Promise<void> => {
    Keyboard.dismiss();
    if (!form.isValid) {
      await form.submit(); // marks every field as touched so all errors become visible
      notify(`Please fix ${pluralize(form.errorCount, 'error')} before saving.`);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    const outcome = await form.submit();
    if (!outcome) return;
    const reminder = describeReminder(outcome.reminder);
    notify([taskId ? 'Task updated' : 'Task created', reminder].filter(Boolean).join(' · '));
  };

  // The header button is rendered by the navigator; keep it pointing at the latest `save`.
  const saveRef = useRef(save);
  useLayoutEffect(() => {
    saveRef.current = save;
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      title: form.isEditing ? 'Edit task' : 'New task',
      headerLeft: () => (
        <IconButton icon="close" onPress={() => navigation.goBack()} accessibilityLabel="Close form" />
      ),
      headerRight: () => (
        <Button
          mode="text"
          onPress={() => void saveRef.current()}
          loading={form.isSubmitting}
          disabled={form.isSubmitting}
          accessibilityLabel="Save task"
        >
          Save
        </Button>
      ),
    });
  }, [navigation, form.isEditing, form.isSubmitting]);

  const useCurrentLocation = async (): Promise<void> => {
    setLocating('current');
    const result = await getCurrentCoordinates();
    if (!result.ok) {
      setLocating(null);
      notify(result.message);
      return;
    }
    form.setCoordinates(result.value);
    if (!values.address.trim()) {
      const address = await reverseGeocode(result.value);
      if (address.ok) setField('address', address.value);
    }
    setLocating(null);
  };

  const findCoordinates = async (): Promise<void> => {
    setLocating('address');
    const result = await geocodeAddress(values.address.trim());
    setLocating(null);
    if (result.ok) {
      form.setCoordinates(result.value);
      notify('Coordinates found for this address');
    } else {
      notify(result.message);
    }
  };

  const onPicked = ({ coordinates: picked, address }: PickedLocation): void => {
    setPickerVisible(false);
    form.setCoordinates(picked);
    if (!address) return;
    if (!values.address.trim()) {
      setField('address', address);
      touch('address');
    } else if (address !== values.address.trim()) {
      notify(`Suggested address: ${address}`, { label: 'Use it', onPress: () => setField('address', address) });
    }
  };

  if (form.notFound) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <EmptyState
          icon="file-hidden"
          title="Task not found"
          message="This task was deleted and can no longer be edited."
          actionLabel="Close"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionCard title="Basics" icon="text-box-outline">
          <View>
            <TextInput
              mode="outlined"
              label="Title *"
              value={values.title}
              onChangeText={(text) => setField('title', text)}
              onBlur={() => touch('title')}
              error={Boolean(errors.title)}
              maxLength={TITLE_MAX_LENGTH}
              returnKeyType="next"
              right={<TextInput.Affix text={`${values.title.length}/${TITLE_MAX_LENGTH}`} />}
            />
            <HelperText type="error" visible={Boolean(errors.title)}>
              {errors.title}
            </HelperText>
          </View>
          <View>
            <TextInput
              mode="outlined"
              label="Description *"
              value={values.description}
              onChangeText={(text) => setField('description', text)}
              onBlur={() => touch('description')}
              error={Boolean(errors.description)}
              maxLength={DESCRIPTION_MAX_LENGTH}
              multiline
              numberOfLines={4}
              style={styles.multiline}
            />
            <HelperText type="error" visible={Boolean(errors.description)}>
              {errors.description}
            </HelperText>
          </View>
        </SectionCard>

        <SectionCard title="Schedule" icon="calendar-clock">
          <DateTimeField
            label="Due date & time *"
            value={values.dueDate}
            onChange={(date) => setField('dueDate', date)}
            onBlur={() => touch('dueDate')}
            error={errors.dueDate}
            warning={form.warnings.dueDate}
          />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            A local notification reminds you {REMINDER_LEAD_MINUTES} minutes before the due time.
          </Text>
        </SectionCard>

        <SectionCard title="Location" icon="map-marker-outline">
          <View>
            <TextInput
              mode="outlined"
              label="Address *"
              value={values.address}
              onChangeText={(text) => setField('address', text)}
              onBlur={() => touch('address')}
              error={Boolean(errors.address)}
              left={<TextInput.Icon icon="map-marker-outline" />}
            />
            <HelperText type="error" visible={Boolean(errors.address)}>
              {errors.address}
            </HelperText>
          </View>

          <View style={styles.row}>
            <Button
              compact
              mode="outlined"
              icon="map-marker-radius-outline"
              onPress={() => {
                setPickerSession((session) => session + 1);
                setPickerVisible(true);
              }}
            >
              Pick on map
            </Button>
            <Button
              compact
              mode="outlined"
              icon="crosshairs-gps"
              loading={locating === 'current'}
              disabled={locating !== null}
              onPress={useCurrentLocation}
            >
              My location
            </Button>
            <Button
              compact
              mode="outlined"
              icon="map-search-outline"
              loading={locating === 'address'}
              disabled={locating !== null || values.address.trim().length < 3}
              onPress={findCoordinates}
            >
              From address
            </Button>
          </View>

          <View style={styles.row}>
            <View style={styles.flex}>
              <TextInput
                mode="outlined"
                label="Latitude"
                dense
                value={values.latitude}
                onChangeText={(text) => setField('latitude', text)}
                onBlur={() => touch('latitude')}
                error={Boolean(errors.latitude)}
                keyboardType={COORDINATE_KEYBOARD}
                placeholder="41.311100"
              />
              <HelperText type="error" visible={Boolean(errors.latitude)}>
                {errors.latitude}
              </HelperText>
            </View>
            <View style={styles.flex}>
              <TextInput
                mode="outlined"
                label="Longitude"
                dense
                value={values.longitude}
                onChangeText={(text) => setField('longitude', text)}
                onBlur={() => touch('longitude')}
                error={Boolean(errors.longitude)}
                keyboardType={COORDINATE_KEYBOARD}
                placeholder="69.279700"
              />
              <HelperText type="error" visible={Boolean(errors.longitude)}>
                {errors.longitude}
              </HelperText>
            </View>
          </View>
          <View style={styles.coordinateFooter}>
            <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
              Coordinates are optional; tasks with coordinates appear on the Map tab.
            </Text>
            {values.latitude || values.longitude ? (
              <Button compact mode="text" onPress={() => form.setCoordinates(null)}>
                Clear
              </Button>
            ) : null}
          </View>
        </SectionCard>

        <SectionCard title="Status" icon="list-status">
          <StatusSelector
            value={values.status}
            options={form.statusOptions}
            onChange={(status) => setField('status', status)}
          />
          {form.isEditing ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Only valid workflow transitions from the current status are offered.
            </Text>
          ) : null}
        </SectionCard>

        <SectionCard title={`Attachments (${values.attachments.length})`} icon="paperclip">
          <AttachmentEditor
            attachments={values.attachments}
            onAdd={(source) => void form.addAttachments(source)}
            onRemove={form.removeAttachment}
            onPreview={setPreview}
            isImporting={form.isImporting}
            error={errors.attachments}
          />
        </SectionCard>

        <View style={styles.footer}>
          <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.flex}>
            Cancel
          </Button>
          <Button
            mode="contained"
            icon="content-save-outline"
            onPress={() => void save()}
            loading={form.isSubmitting}
            disabled={form.isSubmitting}
            style={styles.flex}
          >
            {form.isEditing ? 'Save changes' : 'Create task'}
          </Button>
        </View>
      </ScrollView>

      <LocationPickerModal
        key={pickerSession}
        visible={pickerVisible}
        initialCoordinates={coordinates}
        onDismiss={() => setPickerVisible(false)}
        onConfirm={onPicked}
      />
      <AttachmentViewerModal attachment={preview} onDismiss={() => setPreview(null)} />
      <ConfirmDialog
        visible={discardAction !== null}
        icon="alert-outline"
        title="Discard changes?"
        message="You have unsaved changes. Leave without saving?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => {
          const action = discardAction;
          setDiscardAction(null);
          if (action) navigation.dispatch(action);
        }}
        onDismiss={() => setDiscardAction(null)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 48,
  },
  multiline: {
    minHeight: 110,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  coordinateFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
});
