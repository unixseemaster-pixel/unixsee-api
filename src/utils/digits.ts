/** Convert Persian / Arabic-Indic digits to ASCII digits. */
export function toEnglishDigits(input: string | undefined) {
  if (typeof input !== 'string') return input;

  return input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
