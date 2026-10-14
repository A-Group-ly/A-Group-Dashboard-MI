import type { Currency, MetricSummary } from '@/types/dashboard';

/** Period-over-period comparison. The percentage is null when the comparison period has no base (never invented). */
export function calculateMoM(current: number, previous: number, currency: Currency): MetricSummary {
  const absoluteChange = current - previous;
  let percentageChange: number | null = null;

  if (previous !== 0) {
    percentageChange = ((current - previous) / Math.abs(previous)) * 100;
  }

  return {
    current,
    previous,
    absoluteChange,
    percentageChange,
    isIncrease: absoluteChange >= 0,
    currency,
  };
}

export function formatCurrency(amount: number, currency: Currency | string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ${currency}`;
}
