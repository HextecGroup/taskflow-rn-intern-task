import { memo, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';

import { getAttachmentFileState, resolveAttachmentUri } from '../services/attachmentService';
import { useAppTheme } from '../theme';
import type { Attachment } from '../types';
import { formatBytes } from '../utils/format';

interface AttachmentTileProps {
  attachment: Attachment;
  size?: number;
  onPress?: (attachment: Attachment) => void;
  onRemove?: (attachment: Attachment) => void;
}

/**
 * Thumbnail with graceful fallbacks:
 *  - file missing on disk (e.g. pulled from the server, or storage cleared) -> "Missing" placeholder;
 *  - image that fails to decode -> "Corrupted" placeholder;
 *  - PDFs -> document icon.
 */
function AttachmentTileComponent({ attachment, size = 96, onPress, onRemove }: AttachmentTileProps) {
  const theme = useAppTheme();
  const [decodeFailed, setDecodeFailed] = useState(false);
  const fileState = useMemo(() => getAttachmentFileState(attachment), [attachment]);
  const uri = useMemo(() => resolveAttachmentUri(attachment), [attachment]);

  const missing = fileState === 'missing';
  const broken = attachment.kind === 'image' && decodeFailed;

  let body;
  if (missing || broken) {
    body = (
      <View style={[styles.placeholder, { backgroundColor: theme.colors.errorContainer }]}>
        <Icon
          source={missing ? 'file-question-outline' : 'image-broken-variant'}
          size={30}
          color={theme.colors.onErrorContainer}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer }}>
          {missing ? 'Missing file' : 'Corrupted'}
        </Text>
      </View>
    );
  } else if (attachment.kind === 'image') {
    body = (
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        onError={() => setDecodeFailed(true)}
        accessibilityIgnoresInvertColors
      />
    );
  } else {
    body = (
      <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Icon source="file-pdf-box" size={38} color={theme.colors.error} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          PDF
        </Text>
      </View>
    );
  }

  return (
    <View style={{ width: size }}>
      <Pressable
        onPress={onPress ? () => onPress(attachment) : undefined}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`Attachment ${attachment.name}${missing ? ', missing' : ''}`}
        style={[styles.frame, { width: size, height: size, borderColor: theme.colors.outlineVariant }]}
      >
        {body}
      </Pressable>
      {onRemove ? (
        <IconButton
          icon="close"
          size={14}
          mode="contained"
          containerColor={theme.colors.inverseSurface}
          iconColor={theme.colors.inverseOnSurface}
          style={styles.remove}
          onPress={() => onRemove(attachment)}
          accessibilityLabel={`Remove ${attachment.name}`}
        />
      ) : null}
      <Text variant="labelSmall" numberOfLines={1} style={styles.caption}>
        {attachment.name}
      </Text>
      <Text variant="labelSmall" numberOfLines={1} style={{ color: theme.colors.onSurfaceVariant }}>
        {formatBytes(attachment.size)}
      </Text>
    </View>
  );
}

export const AttachmentTile = memo(AttachmentTileComponent);

const styles = StyleSheet.create({
  frame: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 4,
  },
  remove: {
    position: 'absolute',
    top: -10,
    right: -10,
    margin: 0,
  },
  caption: {
    marginTop: 4,
  },
});
