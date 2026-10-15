/**
 * Billing and subscription calculations. Pure functions over plain rows (dates are ISO strings,
 * money is number). Used by the API routes; currencies are NEVER combined.
 * Definitions follow plans/category-3: MRR counts ACTIVE subscriptions only; ARR = MRR x 12;
 * failed / pending payments are not collections; "overdue" is derived from the due date.
 */
import { addDays, diffDays } from './period.ts';

export type Cur = 'LYD' | 'USD';
export type Interval = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type SubStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID';

export interface SubscriptionRow {
  status: SubStatus;
  price: number;
  currency: Cur;
  interval: Interval;
}

export interface InvoiceRow {
  total: number;
  currency: Cur;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
}

export interface PaymentRow {
  amount: number;
  currency: Cur;
  date: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
}

const CURRENCIES: Cur[] = ['LYD', 'USD'];

export function perCurrency<T>(make: () => T): Record<Cur, T> {
  return { LYD: make(), USD: make() };
}

export function monthlyNormalized(price: number, interval: Interval): number {
  switch (interval) {
    case 'WEEKLY':
      return (price * 52) / 12;
    case 'QUARTERLY':
      return price / 3;
    case 'YEARLY':
      return price / 12;
    default:
      return price;
  }
}

export function mrrByCurrency(subs: SubscriptionRow[]): Record<Cur, number> {
  const out = perCurrency(() => 0);
  for (const s of subs) if (s.status === 'ACTIVE') out[s.currency] += monthlyNormalized(s.price, s.interval);
  return out;
}

export type DerivedInvoiceStatus = 'draft' | 'issued' | 'overdue' | 'paid' | 'void';

export function derivedInvoiceStatus(inv: Pick<InvoiceRow, 'status' | 'dueDate'>, today: string): DerivedInvoiceStatus {
  if (inv.status === 'ISSUED') return inv.dueDate < today ? 'overdue' : 'issued';
  return inv.status.toLowerCase() as DerivedInvoiceStatus;
}

export function isOutstanding(inv: Pick<InvoiceRow, 'status'>): boolean {
  return inv.status === 'ISSUED';
}

export type AgingBucket = 'notDue' | 'd30' | 'd60' | 'd90' | 'd90p';

export function agingBuckets(invoices: InvoiceRow[], today: string): Record<AgingBucket, Record<Cur, number>> {
  const out: Record<AgingBucket, Record<Cur, number>> = {
    notDue: perCurrency(() => 0),
    d30: perCurrency(() => 0),
    d60: perCurrency(() => 0),
    d90: perCurrency(() => 0),
    d90p: perCurrency(() => 0),
  };
  for (const inv of invoices) {
    if (!isOutstanding(inv)) continue;
    const late = diffDays(inv.dueDate, today);
    const b: AgingBucket = late <= 0 ? 'notDue' : late <= 30 ? 'd30' : late <= 60 ? 'd60' : late <= 90 ? 'd90' : 'd90p';
    out[b][inv.currency] += inv.total;
  }
  return out;
}

export function invoicedCollected(invoices: InvoiceRow[], payments: PaymentRow[]) {
  const out = perCurrency(() => ({ invoiced: 0, collected: 0, outstanding: 0 }));
  for (const inv of invoices) {
    if (inv.status === 'DRAFT' || inv.status === 'VOID') continue;
    out[inv.currency].invoiced += inv.total;
    if (inv.status === 'ISSUED') out[inv.currency].outstanding += inv.total;
  }
  for (const p of payments) if (p.status === 'SUCCEEDED') out[p.currency].collected += p.amount;
  return out;
}

export function endOfMonth(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
}

export interface FinancialPosition {
  currency: Cur;
  /** Succeeded payments inside the selected period / the comparison period. */
  paid: number;
  paidPrevious: number;
  paidCount: number;
  /** Unpaid issued invoices that were issued on or before the end of the period. */
  outstanding: number;
  outstandingCount: number;
  overdue: number;
  overdueCount: number;
  notYetDue: number;
  /** Unpaid invoices due by the end of the CURRENT month (overdue ones included: they are due now). */
  expectedByMonthEnd: number;
  expectedByMonthEndCount: number;
  /** Part of the above that is not overdue yet (due between today and month end). */
  dueLaterThisMonth: number;
  monthEnd: string;
}

export function financialPosition(args: {
  currency: Cur;
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  range: { from: string; to: string };
  previousRange: { from: string; to: string };
  today: string;
}): FinancialPosition {
  const { currency, invoices, payments, range, previousRange, today } = args;
  const monthEnd = endOfMonth(today);

  const inRange = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;
  const ok = payments.filter((p) => p.currency === currency && p.status === 'SUCCEEDED');
  const paid = ok.filter((p) => inRange(p.date, range));

  const open = invoices.filter((i) => i.currency === currency && isOutstanding(i) && i.issueDate <= range.to);
  const overdue = open.filter((i) => i.dueDate < today);
  const sum = (rows: { total: number }[]) => rows.reduce((s, r) => s + r.total, 0);

  const dueByEnd = open.filter((i) => i.dueDate <= monthEnd);
  return {
    currency,
    paid: paid.reduce((s, p) => s + p.amount, 0),
    paidPrevious: ok.filter((p) => inRange(p.date, previousRange)).reduce((s, p) => s + p.amount, 0),
    paidCount: paid.length,
    outstanding: sum(open),
    outstandingCount: open.length,
    overdue: sum(overdue),
    overdueCount: overdue.length,
    notYetDue: sum(open.filter((i) => i.dueDate >= today)),
    expectedByMonthEnd: sum(dueByEnd),
    expectedByMonthEndCount: dueByEnd.length,
    dueLaterThisMonth: sum(dueByEnd.filter((i) => i.dueDate >= today)),
    monthEnd,
  };
}

export function daysUntil(today: string, iso: string): number {
  return diffDays(today, iso);
}

export { addDays };
export const ALL_CURRENCIES = CURRENCIES;
