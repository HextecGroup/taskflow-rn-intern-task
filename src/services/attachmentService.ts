import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

import type { Attachment, AttachmentKind } from '../types';
import { MAX_ATTACHMENT_SIZE_BYTES } from '../utils/constants';
import { formatBytes, errorMessage } from '../utils/format';
import { createId } from '../utils/id';

const ATTACHMENTS_DIR = 'attachments';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

export type AttachmentPickResult =
  | { status: 'success'; attachments: Attachment[]; rejected: string[] }
  | { status: 'cancelled' }
  | { status: 'permission-denied' }
  | { status: 'error'; message: string };

export type AttachmentFileState = 'available' | 'missing';

interface SourceFile {
  uri: string;
  name: string | null | undefined;
  mimeType: string | null | undefined;
  size: number | null | undefined;
}

function extensionOf(name: string): string | null {
  const match = /\.([a-z0-9]{1,5})$/i.exec(name);
  return match?.[1] ? match[1].toLowerCase() : null;
}

function kindOf(mimeType: string, name: string): AttachmentKind | null {
  if (mimeType === 'application/pdf' || extensionOf(name) === 'pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  return null;
}

function attachmentsDirectory(): Directory {
  const directory = new Directory(Paths.document, ATTACHMENTS_DIR);
  if (!directory.exists) directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function attachmentFile(attachment: Pick<Attachment, 'fileName'>): File {
  return new File(Paths.document, ATTACHMENTS_DIR, attachment.fileName);
}

/** Absolute URI for rendering/sharing, resolved against the *current* sandbox path. */
export function resolveAttachmentUri(attachment: Pick<Attachment, 'fileName'>): string {
  return attachmentFile(attachment).uri;
}

export function getAttachmentFileState(attachment: Pick<Attachment, 'fileName'>): AttachmentFileState {
  try {
    return attachmentFile(attachment).exists ? 'available' : 'missing';
  } catch {
    return 'missing';
  }
}

/** Copies a picked file into the app's persistent storage and returns its metadata. */
async function importFile(source: SourceFile): Promise<Attachment> {
  const originalName = (source.name ?? '').trim() || `file-${Date.now()}`;
  const extension = extensionOf(originalName);
  const mimeType = source.mimeType || (extension ? MIME_BY_EXTENSION[extension] : undefined) || '';
  const kind = kindOf(mimeType, originalName);
  if (!kind) throw new Error(`“${originalName}” is not an image or PDF.`);
  if (source.size != null && source.size > MAX_ATTACHMENT_SIZE_BYTES) {
    throw new Error(`“${originalName}” is larger than ${formatBytes(MAX_ATTACHMENT_SIZE_BYTES)}.`);
  }

  const id = createId();
  const fileName = `${id}.${extension ?? EXTENSION_BY_MIME[mimeType] ?? (kind === 'pdf' ? 'pdf' : 'jpg')}`;
  const destination = new File(attachmentsDirectory(), fileName);
  await new File(source.uri).copy(destination);

  let size = source.size ?? null;
  try {
    size = destination.size;
  } catch {
    // keep the picker-reported size
  }

  return {
    id,
    name: originalName,
    mimeType: mimeType || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    kind,
    size,
    fileName,
    addedAt: new Date().toISOString(),
  };
}

async function importAll(sources: SourceFile[]): Promise<AttachmentPickResult> {
  const attachments: Attachment[] = [];
  const rejected: string[] = [];
  for (const source of sources) {
    try {
      attachments.push(await importFile(source));
    } catch (error) {
      rejected.push(errorMessage(error));
    }
  }
  return { status: 'success', attachments, rejected };
}

export async function pickImagesFromLibrary(limit: number): Promise<AttachmentPickResult> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: limit > 1,
      selectionLimit: Math.max(1, limit),
      quality: 0.8,
    });
    if (result.canceled) return { status: 'cancelled' };
    return importAll(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName,
        mimeType: asset.mimeType,
        size: asset.fileSize,
      })),
    );
  } catch (error) {
    return { status: 'error', message: errorMessage(error) };
  }
}

export async function takePhoto(): Promise<AttachmentPickResult> {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'permission-denied' };
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return { status: 'cancelled' };
    return importAll(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      })),
    );
  } catch (error) {
    return { status: 'error', message: errorMessage(error) };
  }
}

export async function pickDocuments(): Promise<AttachmentPickResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (result.canceled) return { status: 'cancelled' };
    return importAll(
      result.assets.map((asset) => ({
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
      })),
    );
  } catch (error) {
    return { status: 'error', message: errorMessage(error) };
  }
}

/** Best-effort removal of attachment files (missing files are ignored). */
export function deleteAttachmentFiles(attachments: readonly Attachment[]): void {
  for (const attachment of attachments) {
    try {
      const file = attachmentFile(attachment);
      if (file.exists) file.delete();
    } catch (error) {
      console.warn('[attachments] Could not delete', attachment.fileName, error);
    }
  }
}

export function deleteAllAttachmentFiles(): void {
  try {
    const directory = new Directory(Paths.document, ATTACHMENTS_DIR);
    if (directory.exists) directory.delete();
  } catch (error) {
    console.warn('[attachments] Could not clear attachments directory', error);
  }
}

/** Opens a file in an external viewer through the OS share sheet ("Open with…"). */
export async function openAttachmentExternally(attachment: Attachment): Promise<{ ok: boolean; message?: string }> {
  if (getAttachmentFileState(attachment) === 'missing') {
    return { ok: false, message: 'The file is no longer available on this device.' };
  }
  try {
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: 'Sharing is not available on this device.' };
    await Sharing.shareAsync(resolveAttachmentUri(attachment), {
      mimeType: attachment.mimeType,
      dialogTitle: attachment.name,
      UTI: attachment.kind === 'pdf' ? 'com.adobe.pdf' : 'public.image',
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}
