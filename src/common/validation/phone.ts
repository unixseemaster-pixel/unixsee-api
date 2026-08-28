import {
  parsePhoneNumberFromString,
  type CountryCode,
  type PhoneNumber,
} from 'libphonenumber-js';

import { toEnglishDigits } from '#/utils/digits.js';

/**
 * Default region for national numbers typed without a country-calling-code
 * prefix. Country-code UI will override this later.
 */
export const DEFAULT_PHONE_COUNTRY: CountryCode = 'IR';

/**
 * Prepare user input for parsing:
 * - Persian (`۰-۹`) / Arabic-Indic (`٠-٩`) digits → ASCII
 * - strip spaces / dashes / parentheses
 * - `00…` international prefix → `+…`
 *
 * Leading `+` is optional. National numbers rely on `defaultCountry`.
 */
export function preparePhoneInput(raw: string): string {
  let value = toEnglishDigits(raw)?.trim() ?? '';
  if (!value) return '';

  value = value.replace(/[\s()-]/g, '');

  if (value.startsWith('00')) {
    value = `+${value.slice(2)}`;
  }

  return value;
}

/**
 * Parse a phone number. Accepts:
 * - national (no `+`) with `defaultCountry` — e.g. `09121234567`, `9121234567`
 * - international with `+` — e.g. `+14155552671`
 * - international with `00` — e.g. `0014155552671`
 * - international digits without `+` — e.g. `989121234567`, `14155552671`
 */
export function parseInternationalPhone(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): PhoneNumber | null {
  const prepared = preparePhoneInput(raw);
  if (!prepared) return null;

  const withDefault = parsePhoneNumberFromString(prepared, defaultCountry);
  if (withDefault?.isValid()) {
    return withDefault;
  }

  if (!prepared.startsWith('+') && /^\d{8,15}$/.test(prepared)) {
    const asInternational = parsePhoneNumberFromString(`+${prepared}`);
    if (asInternational?.isValid()) {
      return asInternational;
    }
  }

  return null;
}

export function isValidInternationalPhone(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): boolean {
  return parseInternationalPhone(raw, defaultCountry) !== null;
}

/** Normalize to E.164 (`+…`). Returns `null` when invalid. */
export function toE164Phone(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  return parseInternationalPhone(raw, defaultCountry)?.format('E.164') ?? null;
}

/** National significant number digits (no country calling code). */
export function toNationalPhone(
  raw: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  return parseInternationalPhone(raw, defaultCountry)?.nationalNumber ?? null;
}
