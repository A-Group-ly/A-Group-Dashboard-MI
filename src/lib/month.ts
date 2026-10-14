/**
 * Month helpers. All dates are handled in UTC because the database columns are
 * `DATE` (no time zone). Using local-time `new Date(y, m, 1)` shifts the range
 * by the server's UTC offset and pulls in transactions from the neighbouring month.
 */

export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidMonth(value: string | null | undefined): value is string {
  return typeof value === 'string' && MONTH_PATTERN.test(value);
}

export function getPreviousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** First and last calendar day of `month`, as UTC-midnight dates (inclusive range for DATE columns). */
export function getMonthRangeUtc(month: string): { start: Date; end: Date } {
  const [year, m] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, m - 1, 1)),
    end: new Date(Date.UTC(year, m, 0)),
  };
}
