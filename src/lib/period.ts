/**
 * Reporting periods and their comparison periods. Pure, UTC-only, ISO `YYYY-MM-DD` strings.
 *
 *   day      the anchor day                       compared with the day before
 *   week     Monday..Sunday containing the anchor  compared with the previous week
 *   month    calendar month                       compared with the previous calendar month
 *   quarter  Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec   compared with the previous quarter
 *   half     Jan-Jun / Jul-Dec                    compared with the previous half-year
 *   custom   from..to (inclusive)                 compared with the same number of days immediately before
 */
export type Granularity = 'day' | 'week' | 'month' | 'quarter' | 'half' | 'custom';

export const GRANULARITIES: Granularity[] = ['day', 'week', 'month', 'quarter', 'half', 'custom'];

export interface PeriodSpec {
  granularity: Granularity;
  /** Any date inside the period (ignored for custom). */
  anchor: string;
  customFrom?: string;
  customTo?: string;
}

export interface Range {
  from: string;
  to: string;
}

const DAY = 86400000;

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  return toIso(new Date(toDate(iso).getTime() + n * DAY));
}

export function diffDays(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / DAY);
}

function monthStart(y: number, m0: number): string {
  return toIso(new Date(Date.UTC(y, m0, 1)));
}
function monthEnd(y: number, m0: number): string {
  return toIso(new Date(Date.UTC(y, m0 + 1, 0)));
}

/** Resolve the spec to an inclusive [from, to] range. */
export function resolveRange(spec: PeriodSpec): Range {
  const a = toDate(spec.anchor);
  const y = a.getUTCFullYear();
  const m = a.getUTCMonth();
  switch (spec.granularity) {
    case 'day':
      return { from: spec.anchor, to: spec.anchor };
    case 'week': {
      const dow = (a.getUTCDay() + 6) % 7; // Monday = 0
      const from = addDays(spec.anchor, -dow);
      return { from, to: addDays(from, 6) };
    }
    case 'month':
      return { from: monthStart(y, m), to: monthEnd(y, m) };
    case 'quarter': {
      const q = Math.floor(m / 3) * 3;
      return { from: monthStart(y, q), to: monthEnd(y, q + 2) };
    }
    case 'half': {
      const h = m < 6 ? 0 : 6;
      return { from: monthStart(y, h), to: monthEnd(y, h + 5) };
    }
    case 'custom': {
      const f = spec.customFrom && isIsoDate(spec.customFrom) ? spec.customFrom : spec.anchor;
      const t = spec.customTo && isIsoDate(spec.customTo) ? spec.customTo : f;
      return f <= t ? { from: f, to: t } : { from: t, to: f };
    }
  }
}

/** The equivalent previous period used for automatic comparison. */
export function previousRange(spec: PeriodSpec): Range {
  const cur = resolveRange(spec);
  switch (spec.granularity) {
    case 'day':
      return { from: addDays(cur.from, -1), to: addDays(cur.from, -1) };
    case 'week':
      return { from: addDays(cur.from, -7), to: addDays(cur.to, -7) };
    case 'month':
    case 'quarter':
    case 'half': {
      const months = spec.granularity === 'month' ? 1 : spec.granularity === 'quarter' ? 3 : 6;
      const d = toDate(cur.from);
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth() - months;
      return { from: monthStart(y, m), to: monthEnd(y, m + months - 1) };
    }
    case 'custom': {
      const len = diffDays(cur.from, cur.to) + 1;
      return { from: addDays(cur.from, -len), to: addDays(cur.from, -1) };
    }
  }
}

/** Move to the neighbouring period (arrows in the picker). Custom ranges shift by their own length. */
export function shiftPeriod(spec: PeriodSpec, dir: -1 | 1): PeriodSpec {
  const cur = resolveRange(spec);
  if (spec.granularity === 'custom') {
    const len = diffDays(cur.from, cur.to) + 1;
    return { ...spec, anchor: addDays(cur.from, dir * len), customFrom: addDays(cur.from, dir * len), customTo: addDays(cur.to, dir * len) };
  }
  if (dir === -1) return { ...spec, anchor: previousRange(spec).from };
  return { ...spec, anchor: addDays(cur.to, 1) };
}

export type Bucket = 'day' | 'week' | 'month';

/** Pick a chart resolution that keeps the number of points readable. */
export function bucketFor(range: Range): Bucket {
  const days = diffDays(range.from, range.to) + 1;
  if (days <= 62) return 'day';
  if (days <= 190) return 'week';
  return 'month';
}

/** Start dates of the buckets covering the range. */
export function bucketStarts(range: Range, bucket: Bucket): string[] {
  const out: string[] = [];
  if (bucket === 'day') {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) out.push(d);
  } else if (bucket === 'week') {
    for (let d = range.from; d <= range.to; d = addDays(d, 7)) out.push(d);
  } else {
    const f = toDate(range.from);
    let y = f.getUTCFullYear();
    let m = f.getUTCMonth();
    for (;;) {
      const s = monthStart(y, m);
      if (s > range.to) break;
      out.push(s < range.from ? range.from : s);
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }
  return out;
}

/** Index of the bucket a date falls into (dates are assumed to be inside the range). */
export function bucketIndex(starts: string[], date: string): number {
  let idx = 0;
  for (let i = 0; i < starts.length; i++) {
    if (starts[i] <= date) idx = i;
    else break;
  }
  return idx;
}

export function daysIn(range: Range): number {
  return diffDays(range.from, range.to) + 1;
}

/** Overlap in days between a range and a calendar month (YYYY-MM-01 string). */
export function overlapWithMonth(range: Range, monthFirst: string): { overlap: number; monthDays: number } {
  const d = toDate(monthFirst);
  const mStart = monthStart(d.getUTCFullYear(), d.getUTCMonth());
  const mEnd = monthEnd(d.getUTCFullYear(), d.getUTCMonth());
  const from = range.from > mStart ? range.from : mStart;
  const to = range.to < mEnd ? range.to : mEnd;
  const overlap = from <= to ? diffDays(from, to) + 1 : 0;
  return { overlap, monthDays: diffDays(mStart, mEnd) + 1 };
}

/** First day of every calendar month touched by the range. */
export function monthsTouched(range: Range): string[] {
  const out: string[] = [];
  const f = toDate(range.from);
  let y = f.getUTCFullYear();
  let m = f.getUTCMonth();
  for (;;) {
    const s = monthStart(y, m);
    if (s > range.to) break;
    out.push(s);
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return out;
}

export function formatRange(range: Range, lang: 'en' | 'ar', granularity?: Granularity): string {
  const locale = lang === 'ar' ? 'ar-LY-u-nu-latn' : 'en-GB';
  const f = (iso: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...opts }).format(toDate(iso));
  if (granularity === 'month') return f(range.from, { month: 'long', year: 'numeric' });
  if (granularity === 'day') return f(range.from, { day: 'numeric', month: 'short', year: 'numeric' });
  if (granularity === 'quarter') return `Q${Math.floor(toDate(range.from).getUTCMonth() / 3) + 1} ${toDate(range.from).getUTCFullYear()}`;
  if (granularity === 'half') return `H${toDate(range.from).getUTCMonth() < 6 ? 1 : 2} ${toDate(range.from).getUTCFullYear()}`;
  const d = { day: 'numeric', month: 'short', year: 'numeric' } as const;
  return range.from === range.to ? f(range.from, d) : `${f(range.from, d)} – ${f(range.to, d)}`;
}
