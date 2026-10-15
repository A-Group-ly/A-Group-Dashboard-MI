import type { Currency, FinancialOverview, MetricSummary, PlatformSource, Transaction } from '@/types/dashboard';

/** Percentage change, or null when the comparison month has no valid base (never invent a %). */
export function pctChange(current: number, previous: number): number | null {
  if (!Number.isFinite(previous) || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface ComparisonItem {
  key: string;
  label: string;
  current: number;
  previous: number;
}

type Kind = 'income' | 'expense';

/** Same recognition rules as the dashboard KPIs: income = paid + pending, expenses = paid only. */
function counts(tx: Transaction, kind: Kind): boolean {
  if (kind === 'income') return tx.type === 'inflow' && tx.status !== 'upcoming';
  return tx.type === 'outflow' && tx.status === 'paid';
}

/** Group by a key and compare two months. Currencies are never mixed: callers pass one currency. */
export function compareBy(
  transactions: Transaction[],
  opts: {
    kind: Kind;
    currency: Currency;
    month: string;
    previousMonth: string;
    groupKey: (tx: Transaction) => string;
    label: (tx: Transaction, language: 'en' | 'ar') => string;
    language: 'en' | 'ar';
  }
): ComparisonItem[] {
  const map = new Map<string, ComparisonItem>();
  for (const tx of transactions) {
    if (tx.currency !== opts.currency || !counts(tx, opts.kind)) continue;
    if (tx.month !== opts.month && tx.month !== opts.previousMonth) continue;
    const key = opts.groupKey(tx);
    const item = map.get(key) ?? { key, label: opts.label(tx, opts.language), current: 0, previous: 0 };
    if (tx.month === opts.month) item.current += tx.amount;
    else item.previous += tx.amount;
    map.set(key, item);
  }
  return [...map.values()].sort((a, b) => b.current + b.previous - (a.current + a.previous));
}

export const PLATFORMS: PlatformSource[] = ['A-Stay', 'A-Market', 'A-Space', 'Corporate', 'Tech Infrastructure'];

export interface MonthRow {
  key: string;
  labelKey: string;
  metric: MetricSummary;
}

/** Rows for the "month in numbers" table (last month, this month, change). */
export function monthInNumbers(o: FinancialOverview, currency: Currency): MonthRow[] {
  const flat = (current: number): MetricSummary => ({
    current,
    previous: NaN,
    absoluteChange: NaN,
    percentageChange: null,
    isIncrease: false,
    currency,
  });
  return [
    { key: 'income', labelKey: 'kpiIncome', metric: o.totalIncome },
    { key: 'expenses', labelKey: 'kpiExpenses', metric: o.totalExpenses },
    { key: 'net', labelKey: 'kpiNetResult', metric: o.netResult },
    { key: 'collected', labelKey: 'kpiCashCollected', metric: o.cashCollected },
    { key: 'collections', labelKey: 'kpiCustomerCollections', metric: o.customerCollections },
    { key: 'budget', labelKey: 'kpiRemainingBudget', metric: o.remainingBudget },
    { key: 'cash', labelKey: 'kpiAvailableCash', metric: o.availableCash },
    // the API reports pending income and upcoming obligations for the current month only
    { key: 'pending', labelKey: 'kpiPendingIncome', metric: flat(o.pendingIncomeTotal) },
    { key: 'upcoming', labelKey: 'upcomingObligations', metric: flat(o.upcomingObligationsTotal) },
  ];
}
