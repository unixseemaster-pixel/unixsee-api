export const UNIXSEE_MESSAGE_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
export const UNIXSEE_MESSAGE_ATTACHMENT_MAX_COUNT = 5;
export const UNIXSEE_MESSAGE_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Allowlist enforced at Nest (matches admin compose UI). */
export const UNIXSEE_MESSAGE_ATTACHMENT_ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function sanitizeUnixseeMessageAttachmentFileName(
  fileName: string,
): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || 'file';
  const safe = base.replace(/[^\w.\-+() ]/g, '_').slice(0, 180);
  return safe || 'file';
}

export function buildUnixseeMessageAttachmentStorageKey(
  messageId: string,
  fileName: string,
): string {
  const safeName = sanitizeUnixseeMessageAttachmentFileName(fileName);
  return `unixsee-messages/${messageId}/${crypto.randomUUID()}/${safeName}`;
}
