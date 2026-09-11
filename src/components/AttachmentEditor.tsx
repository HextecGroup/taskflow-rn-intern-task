import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, HelperText, Text } from 'react-native-paper';

import type { AttachmentSource } from '../hooks/useTaskForm';
import { useAppTheme } from '../theme';
import type { Attachment } from '../types';
import { MAX_ATTACHMENT_SIZE_BYTES, MAX_ATTACHMENTS_PER_TASK } from '../utils/constants';
import { formatBytes } from '../utils/format';
import { AttachmentTile } from './AttachmentTile';

interface AttachmentEditorProps {
  attachments: Attachment[];
  onAdd: (source: AttachmentSource) => void;
  onRemove: (attachmentId: string) => void;
  onPreview: (attachment: Attachment) => void;
  isImporting: boolean;
  error?: string;
}

export function AttachmentEditor({ attachments, onAdd, onRemove, onPreview, isImporting, error }: AttachmentEditorProps) {
  const theme = useAppTheme();
  const full = attachments.length >= MAX_ATTACHMENTS_PER_TASK;
  const disabled = isImporting || full;

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <Button compact mode="outlined" icon="image-multiple-outline" disabled={disabled} onPress={() => onAdd('library')}>
          Photos
        </Button>
        <Button compact mode="outlined" icon="camera-outline" disabled={disabled} onPress={() => onAdd('camera')}>
          Camera
        </Button>
        <Button compact mode="outlined" icon="file-pdf-box" disabled={disabled} onPress={() => onAdd('documents')}>
          PDF / Files
        </Button>
      </View>

      {isImporting ? (
        <View style={styles.importing}>
          <ActivityIndicator size={16} />
          <Text variant="bodySmall">Copying files into app storage…</Text>
        </View>
      ) : null}

      {attachments.length > 0 ? (
        <View style={styles.grid}>
          {attachments.map((attachment) => (
            <AttachmentTile
              key={attachment.id}
              attachment={attachment}
              size={88}
              onPress={onPreview}
              onRemove={(item) => onRemove(item.id)}
            />
          ))}
        </View>
      ) : (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Optional. Images or PDFs, up to {MAX_ATTACHMENTS_PER_TASK} files ({formatBytes(MAX_ATTACHMENT_SIZE_BYTES)} each).
        </Text>
      )}

      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  importing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    paddingTop: 8,
  },
});
