export const TICKET_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const TICKET_ATTACHMENT_MAX_COUNT = 20;
export const TICKET_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 60;

/** Allowlist enforced at Nest (trusted boundary). Empty content-type is rejected. */
export const TICKET_ATTACHMENT_ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'text/plain',
]);

export function sanitizeTicketAttachmentFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() || 'file';
  const safe = base.replace(/[^\w.\-+() ]/g, '_').slice(0, 180);
  return safe || 'file';
}

export function buildTicketAttachmentStorageKey(
  ticketId: string,
  fileName: string,
): string {
  const safeName = sanitizeTicketAttachmentFileName(fileName);
  return `tickets/${ticketId}/${crypto.randomUUID()}/${safeName}`;
}
