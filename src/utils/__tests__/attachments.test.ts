import type { Attachment } from '../../types';
import { diffAttachments, listAttachmentNames } from '../attachments';

const attachment = (id: string): Attachment => ({
  id,
  name: `${id}.jpg`,
  mimeType: 'image/jpeg',
  kind: 'image',
  size: 1024,
  fileName: `${id}.jpg`,
  addedAt: '2026-09-11T10:00:00.000Z',
});

describe('diffAttachments', () => {
  it('detects added and removed attachments by id', () => {
    const diff = diffAttachments([attachment('a'), attachment('b')], [attachment('b'), attachment('c')]);
    expect(diff.added.map((item) => item.id)).toEqual(['c']);
    expect(diff.removed.map((item) => item.id)).toEqual(['a']);
  });

  it('reports no changes for identical lists', () => {
    expect(diffAttachments([attachment('a')], [attachment('a')])).toEqual({ added: [], removed: [] });
  });
});

describe('listAttachmentNames', () => {
  it('lists names and summarises the rest', () => {
    expect(listAttachmentNames([attachment('a'), attachment('b')])).toBe('a.jpg, b.jpg');
    expect(listAttachmentNames(['a', 'b', 'c', 'd', 'e'].map(attachment))).toBe('a.jpg, b.jpg, c.jpg and 2 more');
  });
});
