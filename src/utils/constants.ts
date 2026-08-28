/**
 * @deprecated Prefer `#/common/validation/phone.js` (`isValidInternationalPhone` /
 * `toE164Phone`). Kept only for any lingering Iran-only regex consumers.
 */
export const VALIDATE_PHONE_NUMBER_REGEX =
  /^(?:\+(?:98|۹۸)[0-9\u06F0-\u06F9]{10}|(?:0098|۰۰۹۸)[0-9\u06F0-\u06F9]{10}|(?:09|۰۹)[0-9\u06F0-\u06F9]{9})$/;
