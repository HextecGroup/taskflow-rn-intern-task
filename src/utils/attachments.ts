import type { Attachment } from '../types';

export interface AttachmentDiff {
  added: Attachment[];
  removed: Attachment[];
}

/** Attachments added and removed between two versions of a task (compared by id). */
export function diffAttachments(before: readonly Attachment[], after: readonly Attachment[]): AttachmentDiff {
  const beforeIds = new Set(before.map((attachment) => attachment.id));
  const afterIds = new Set(after.map((attachment) => attachment.id));
  return {
    added: after.filter((attachment) => !beforeIds.has(attachment.id)),
    removed: before.filter((attachment) => !afterIds.has(attachment.id)),
  };
}

/** "a.jpg, b.pdf and 2 more" */
export function listAttachmentNames(attachments: readonly Attachment[], max = 3): string {
  const names = attachments.slice(0, max).map((attachment) => attachment.name);
  const rest = attachments.length - names.length;
  return rest > 0 ? `${names.join(', ')} and ${rest} more` : names.join(', ');
}
