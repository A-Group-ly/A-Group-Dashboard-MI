/**
 * Brand names stay in Latin script in Arabic text (A-Group, A-Stay, A-Market, A-Space).
 * Normalises Arabic transliterations that may exist in older database rows.
 */
const BRAND_FIXES: [RegExp, string][] = [
  [/[أاإ]\s?-?\s?جروب/g, 'A-Group'],
  [/[أاإ]ي\s?-?\s?ستاي/g, 'A-Stay'],
  [/[أاإ]ي\s?-?\s?ماركت/g, 'A-Market'],
  [/[أاإ]ي\s?-?\s?سبيس/g, 'A-Space'],
];

export function keepBrandNames(text: string): string {
  return BRAND_FIXES.reduce((s, [re, to]) => s.replace(re, to), text);
}
