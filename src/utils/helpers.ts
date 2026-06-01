export function toEnglishDigits(input: string | undefined) {
  if (typeof input !== 'string') return input;

  return input.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  //   return Number(englishDigits);
}
