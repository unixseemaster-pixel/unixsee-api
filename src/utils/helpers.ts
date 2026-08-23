export function toEnglishDigits(input: string | undefined) {
  if (typeof input !== 'string') return input;

  return input.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  //   return Number(englishDigits);
}

/** Align public intake phone lookup with client auth E.164 Iran formatting. */
export function normalizeContactPhoneToE164(phone: string): string {
  let english = toEnglishDigits(phone)?.replace(/[\s()-]/g, '') ?? '';
  if (!english) return '';

  if (english.startsWith('+')) {
    english = english.slice(1);
  }

  if (english.startsWith('00')) {
    english = english.slice(2);
  }

  if (english.startsWith('98')) {
    return `+${english}`;
  }

  const national = english.replace(/^0/, '');
  return `+98${national}`;
}

export function normalizeContactEmail(email: string | undefined): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

/** Hostname only, lowercase, without leading www. */
export function normalizeWebsiteDomain(input: string | undefined): string | null {
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
