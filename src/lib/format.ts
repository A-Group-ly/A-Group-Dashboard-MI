export function monthLabel(month: string, lang: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T00:00:00Z`));
}

/** "1–31 October 2026" style period for a YYYY-MM month. */
export function periodLabel(month: string, lang: 'en' | 'ar'): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const monthName = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, 1))
  );
  return `1–${last} ${monthName}`;
}
