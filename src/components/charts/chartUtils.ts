export function niceMax(v: number): number {
  if (!(v > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

/** 1.2k / 3.4M style axis labels. */
export function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
  if (a >= 1000) return `${+(v / 1000).toFixed(a >= 10000 ? 0 : 1)}k`;
  return String(+v.toFixed(1));
}

export function shortDate(iso: string, lang: 'en' | 'ar', bucket: 'day' | 'week' | 'month'): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const locale = lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB';
  const opts: Intl.DateTimeFormatOptions =
    bucket === 'month' ? { month: 'short', year: '2-digit', timeZone: 'UTC' } : { day: 'numeric', month: 'short', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

export const SLICE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-5)', 'var(--chart-6)', 'var(--chart-4)'];
