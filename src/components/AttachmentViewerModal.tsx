import { useState } from 'react';
import { Image, Modal, StyleSheet, View } from 'react-native';
import { Button, Icon, IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getAttachmentFileState,
  openAttachmentExternally,
  resolveAttachmentUri,
} from '../services/attachmentService';
import type { Attachment } from '../types';
import { formatBytes } from '../utils/format';

interface AttachmentViewerModalProps {
  attachment: Attachment | null;
  onDismiss: () => void;
}

const FOREGROUND = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.7)';

/** Full-screen viewer: images are shown inline, PDFs can be opened in an external viewer. */
export function AttachmentViewerModal({ attachment, onDismiss }: AttachmentViewerModalProps) {
  if (!attachment) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
      {/* Keyed by attachment so per-file state (decode errors) starts fresh for each file. */}
      <ViewerContent key={attachment.id} attachment={attachment} onDismiss={onDismiss} />
    </Modal>
  );
}

function ViewerContent({ attachment, onDismiss }: { attachment: Attachment; onDismiss: () => void }) {
  const [decodeFailed, setDecodeFailed] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const missing = getAttachmentFileState(attachment) === 'missing';
  const showImage = attachment.kind === 'image' && !missing && !decodeFailed;

  const openExternally = async (): Promise<void> => {
    const result = await openAttachmentExternally(attachment);
    setShareError(result.ok ? null : (result.message ?? 'Could not open the file.'));
  };

  let fallbackIcon = 'file-pdf-box';
  let fallbackText = 'PDF documents open in your preferred viewer.';
  if (missing) {
    fallbackIcon = 'file-question-outline';
    fallbackText =
      'This file is not available on this device. It may have been attached on another device or removed from storage.';
  } else if (decodeFailed) {
    fallbackIcon = 'image-broken-variant';
    fallbackText = 'This image appears to be corrupted and cannot be displayed.';
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text variant="titleMedium" numberOfLines={1} style={{ color: FOREGROUND }}>
            {attachment.name}
          </Text>
          <Text variant="bodySmall" style={{ color: MUTED }}>
            {attachment.kind.toUpperCase()} · {formatBytes(attachment.size)}
          </Text>
        </View>
        {!missing ? (
          <IconButton
            icon="share-variant"
            iconColor={FOREGROUND}
            onPress={openExternally}
            accessibilityLabel="Share or open with"
          />
        ) : null}
        <IconButton icon="close" iconColor={FOREGROUND} onPress={onDismiss} accessibilityLabel="Close viewer" />
      </View>

      <View style={styles.body}>
        {showImage ? (
          <Image
            source={{ uri: resolveAttachmentUri(attachment) }}
            style={styles.image}
            resizeMode="contain"
            onError={() => setDecodeFailed(true)}
          />
        ) : (
          <View style={styles.fallback}>
            <Icon source={fallbackIcon} size={96} color={missing || decodeFailed ? '#F87171' : FOREGROUND} />
            <Text variant="bodyMedium" style={[styles.fallbackText, { color: MUTED }]}>
              {fallbackText}
            </Text>
            {!missing && attachment.kind === 'pdf' ? (
              <Button mode="contained" icon="open-in-new" onPress={openExternally}>
                Open PDF
              </Button>
            ) : null}
          </View>
        )}
        {shareError ? (
          <Text variant="bodySmall" style={styles.error}>
            {shareError}
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
  },
  titleBlock: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  fallback: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  fallbackText: {
    textAlign: 'center',
  },
  error: {
    color: '#F87171',
    textAlign: 'center',
    padding: 16,
  },
});
