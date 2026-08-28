export { toEnglishDigits } from './digits.js';
export { toE164Phone as normalizeContactPhoneToE164 } from '#/common/validation/phone.js';

export function normalizeContactEmail(
  email: string | undefined,
): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

/** Hostname only, lowercase, without leading www. */
export function normalizeWebsiteDomain(
  input: string | undefined,
): string | null {
  const trimmed = input?.trim().toLowerCase();
  if (!trimmed) return null;

  try {
    const withScheme = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const hostname = new URL(withScheme).hostname.replace(/^www\./, '');
    return hostname || null;
  } catch {
    return null;
  }
}
