import type { PrismaClient } from '@prisma/client';
import type { Currency, FinancialOverview, PaymentChannelBreakdown } from '@/types/dashboard';
import { calculateMoM } from '../calculations';
import { endOfMonth } from '../billing';
import { PLATFORM_BY_CODE } from '../mapApi';
import {
  bucketFor,
  bucketIndex,
  bucketStarts,
  monthsTouched,
  overlapWithMonth,
  type Bucket,
  type Range,
} from '../period';

/**
 * Reference implementation of the finance aggregations (one readable query per metric, per currency).
 * The app runs financeSql.ts, which produces identical numbers in ~7 statements for both currencies (verified
 * range by range against this file). This file still owns the shared result types and documents the rules.
 */

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const n = (v: { toString(): string } | null | undefined) => (v == null ? 0 : Number(v.toString()));

interface Sums {
  income: number; // INCOME that is not UPCOMING (recognised)
  cashCollected: number; // INCOME PAID
  expenses: number; // EXPENSE PAID
  collections: number; // INCOME in the "Customer Collection" category
  pending: number; // INCOME PENDING
  upcoming: number; // EXPENSE UPCOMING
}

async function rangeSums(prisma: PrismaClient, orgId: string, currency: Currency, range: Range): Promise<Sums> {
  const rows = await prisma.financialTransaction.groupBy({
    by: ['type', 'status', 'category'],
    where: { organizationId: orgId, currency, transactionDate: { gte: d(range.from), lte: d(range.to) } },
    _sum: { amount: true },
  });
  const s: Sums = { income: 0, cashCollected: 0, expenses: 0, collections: 0, pending: 0, upcoming: 0 };
  for (const r of rows) {
    const v = n(r._sum.amount);
    if (r.type === 'INCOME') {
      if (r.status !== 'UPCOMING') s.income += v;
      if (r.status === 'PAID') s.cashCollected += v;
      if (r.status === 'PENDING') s.pending += v;
      if (r.category === 'Customer Collection') s.collections += v;
    } else {
      if (r.status === 'PAID') s.expenses += v;
      if (r.status === 'UPCOMING') s.upcoming += v;
    }
  }
  return s;
}

/** Cumulative recognised income minus paid expenses up to and including `to`. */
async function cumulativeNet(prisma: PrismaClient, orgId: string, currency: Currency, to: string): Promise<number> {
  const rows = await prisma.financialTransaction.groupBy({
    by: ['type', 'status'],
    where: { organizationId: orgId, currency, transactionDate: { lte: d(to) } },
    _sum: { amount: true },
  });
  let net = 0;
  for (const r of rows) {
    const v = n(r._sum.amount);
    if (r.type === 'INCOME' && r.status !== 'UPCOMING') net += v;
    if (r.type === 'EXPENSE' && r.status === 'PAID') net -= v;
  }
  return net;
}

/** Monthly company-wide budget caps, prorated by days when the range is not a whole month. */
async function budgetCap(prisma: PrismaClient, orgId: string, currency: Currency, range: Range) {
  const months = monthsTouched(range);
  const rows = await prisma.monthlyBudget.findMany({
    where: { organizationId: orgId, currency, platformId: null, month: { in: months.map(d) } },
  });
  let cap = 0;
  let prorated = false;
  for (const r of rows) {
    const key = r.month.toISOString().slice(0, 10);
    const { overlap, monthDays } = overlapWithMonth(range, key);
    if (overlap < monthDays) prorated = true;
    cap += (n(r.amount) * overlap) / monthDays;
  }
  return { cap, prorated, configured: rows.length > 0 };
}

async function paymentChannels(prisma: PrismaClient, orgId: string, currency: Currency, range: Range, type: 'INCOME' | 'EXPENSE'): Promise<PaymentChannelBreakdown[]> {
  const rows = await prisma.financialTransaction.groupBy({
    by: ['paymentMethod'],
    where: { organizationId: orgId, currency, type, status: 'PAID', transactionDate: { gte: d(range.from), lte: d(range.to) } },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const total = rows.reduce((s, r) => s + n(r._sum.amount), 0);
  return rows
    .map((r) => ({
      paymentMethod: r.paymentMethod,
      amount: n(r._sum.amount),
      percentage: total > 0 ? (n(r._sum.amount) / total) * 100 : 0,
      transactionCount: r._count._all,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function financeOverview(prisma: PrismaClient, orgId: string, currency: Currency, range: Range, prev: Range) {
  const [cur, old, netCur, netPrev, opening, cap, capPrev, incomeCh, expenseCh] = await Promise.all([
    rangeSums(prisma, orgId, currency, range),
    rangeSums(prisma, orgId, currency, prev),
    cumulativeNet(prisma, orgId, currency, range.to),
    cumulativeNet(prisma, orgId, currency, prev.to),
    prisma.openingBalance.findFirst({
      where: { organizationId: orgId, currency, effectiveDate: { lte: d(range.to) } },
      orderBy: { effectiveDate: 'desc' },
    }),
    budgetCap(prisma, orgId, currency, range),
    budgetCap(prisma, orgId, currency, prev),
    paymentChannels(prisma, orgId, currency, range, 'INCOME'),
    paymentChannels(prisma, orgId, currency, range, 'EXPENSE'),
  ]);

  const base = opening ? n(opening.amount) : 0;
  const remaining = cap.configured ? cap.cap - cur.expenses : 0;
  const remainingPrev = capPrev.configured ? capPrev.cap - old.expenses : 0;

  const overview: FinancialOverview = {
    totalIncome: calculateMoM(cur.income, old.income, currency),
    totalExpenses: calculateMoM(cur.expenses, old.expenses, currency),
    netResult: calculateMoM(cur.income - cur.expenses, old.income - old.expenses, currency),
    availableCash: calculateMoM(base + netCur, base + netPrev, currency),
    remainingBudget: calculateMoM(remaining, remainingPrev, currency),
    customerCollections: calculateMoM(cur.collections, old.collections, currency),
    upcomingObligationsTotal: cur.upcoming,
    cashCollected: calculateMoM(cur.cashCollected, old.cashCollected, currency),
    pendingIncomeTotal: cur.pending,
    budgetOverrun: remaining < 0 ? Math.abs(remaining) : 0,
    incomeByPaymentMethod: incomeCh,
    expensesByPaymentMethod: expenseCh,
  };

  return {
    overview,
    meta: {
      openingBalance: base,
      budgetCap: cap.configured ? cap.cap : 0,
      budgetConfigured: cap.configured,
      budgetProrated: cap.prorated,
      isIllustrative: true,
    },
  };
}

export interface SeriesPoint {
  start: string;
  income: number;
  expenses: number;
  prevStart: string | null;
  prevIncome: number | null;
  prevExpenses: number | null;
}

export async function financeSeries(prisma: PrismaClient, orgId: string, currency: Currency, range: Range, prev: Range) {
  const bucket: Bucket = bucketFor(range);
  const starts = bucketStarts(range, bucket);
  const prevStarts = bucketStarts(prev, bucket);

  const load = async (r: Range, st: string[]) => {
    const rows = await prisma.financialTransaction.groupBy({
      by: ['transactionDate', 'type', 'status'],
      where: { organizationId: orgId, currency, transactionDate: { gte: d(r.from), lte: d(r.to) } },
      _sum: { amount: true },
    });
    const income = st.map(() => 0);
    const expenses = st.map(() => 0);
    for (const row of rows) {
      const i = bucketIndex(st, row.transactionDate.toISOString().slice(0, 10));
      const v = n(row._sum.amount);
      if (row.type === 'INCOME' && row.status !== 'UPCOMING') income[i] += v;
      if (row.type === 'EXPENSE' && row.status === 'PAID') expenses[i] += v;
    }
    return { income, expenses };
  };

  const [cur, old] = await Promise.all([load(range, starts), load(prev, prevStarts)]);
  const points: SeriesPoint[] = starts.map((start, i) => ({
    start,
    income: cur.income[i],
    expenses: cur.expenses[i],
    prevStart: prevStarts[i] ?? null,
    prevIncome: i < prevStarts.length ? old.income[i] : null,
    prevExpenses: i < prevStarts.length ? old.expenses[i] : null,
  }));
  return { bucket, points };
}

export interface BreakdownItem {
  key: string;
  label: string;
  labelAr: string;
  current: number;
  previous: number;
}

export async function financeBreakdown(prisma: PrismaClient, orgId: string, currency: Currency, range: Range, prev: Range) {
  const where = (r: Range) => ({ organizationId: orgId, currency, transactionDate: { gte: d(r.from), lte: d(r.to) } });

  const cat = async (r: Range) =>
    prisma.financialTransaction.groupBy({
      by: ['category', 'categoryAr'],
      where: { ...where(r), type: 'EXPENSE', status: 'PAID' },
      _sum: { amount: true },
    });
  const plat = async (r: Range) =>
    prisma.financialTransaction.groupBy({
      by: ['platformId'],
      where: { ...where(r), type: 'INCOME', status: { not: 'UPCOMING' } },
      _sum: { amount: true },
    });

  const [catCur, catPrev, platCur, platPrev, platforms] = await Promise.all([
    cat(range),
    cat(prev),
    plat(range),
    plat(prev),
    prisma.platform.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, code: true } }),
  ]);

  const expensesByCategory = new Map<string, BreakdownItem>();
  for (const [rows, field] of [[catCur, 'current'], [catPrev, 'previous']] as const) {
    for (const r of rows) {
      const it = expensesByCategory.get(r.category) ?? { key: r.category, label: r.category, labelAr: r.categoryAr ?? r.category, current: 0, previous: 0 };
      it[field] += n(r._sum.amount);
      expensesByCategory.set(r.category, it);
    }
  }

  const incomeByPlatform = new Map<string, BreakdownItem>();
  for (const [rows, field] of [[platCur, 'current'], [platPrev, 'previous']] as const) {
    for (const r of rows) {
      const p = platforms.find((x) => x.id === r.platformId);
      const key = p?.code ?? 'UNASSIGNED';
      const it = incomeByPlatform.get(key) ?? { key, label: (p && PLATFORM_BY_CODE[p.code]) || p?.name || 'Unassigned', labelAr: (p && PLATFORM_BY_CODE[p.code]) || p?.name || 'Unassigned', current: 0, previous: 0 };
      it[field] += n(r._sum.amount);
      incomeByPlatform.set(key, it);
    }
  }

  const sort = (m: Map<string, BreakdownItem>) => [...m.values()].sort((a, b) => b.current + b.previous - (a.current + a.previous));
  return { expensesByCategory: sort(expensesByCategory), incomeByPlatform: sort(incomeByPlatform) };
}

/**
 * Spending for the calendar month that contains `today`: what has been paid out so far, what is already
 * scheduled (UPCOMING / PENDING expenses) up to month end, and the resulting projected month total.
 */
export async function monthSpending(prisma: PrismaClient, orgId: string, currency: Currency, today: string) {
  const monthStart = `${today.slice(0, 8)}01`;
  const monthEnd = endOfMonth(today);
  const base = { organizationId: orgId, currency, type: 'EXPENSE' as const };
  const [paid, scheduled, cap] = await Promise.all([
    prisma.financialTransaction.aggregate({
      where: { ...base, status: 'PAID', transactionDate: { gte: d(monthStart), lte: d(monthEnd) } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.financialTransaction.aggregate({
      where: { ...base, status: { in: ['UPCOMING', 'PENDING'] }, transactionDate: { lte: d(monthEnd) } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    budgetCap(prisma, orgId, currency, { from: monthStart, to: monthEnd }),
  ]);
  const spentToDate = n(paid._sum.amount);
  const scheduledToMonthEnd = n(scheduled._sum.amount);
  return {
    monthStart,
    monthEnd,
    spentToDate,
    spentCount: paid._count._all,
    scheduledToMonthEnd,
    scheduledCount: scheduled._count._all,
    projected: spentToDate + scheduledToMonthEnd,
    budgetCap: cap.configured ? cap.cap : 0,
    budgetConfigured: cap.configured,
  };
}

export interface PlatformSummary {
  code: string;
  name: string;
  income: number;
  incomeCount: number;
  expense: number;
  expenseCount: number;
  topIncome: { category: string; categoryAr: string; amount: number } | null;
  topExpense: { category: string; categoryAr: string; amount: number } | null;
}

/** Per-platform income / expense totals with the largest category of each (one grouped query). */
export async function platformSummary(prisma: PrismaClient, orgId: string, currency: Currency, range: Range): Promise<PlatformSummary[]> {
  const [rows, platforms] = await Promise.all([
    prisma.financialTransaction.groupBy({
      by: ['platformId', 'type', 'category', 'categoryAr'],
      where: {
        organizationId: orgId,
        currency,
        transactionDate: { gte: d(range.from), lte: d(range.to) },
        OR: [{ type: 'INCOME', status: { not: 'UPCOMING' } }, { type: 'EXPENSE', status: 'PAID' }],
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.platform.findMany({ where: { organizationId: orgId }, select: { id: true, name: true, code: true } }),
  ]);
  const map = new Map<string, PlatformSummary>();
  for (const r of rows) {
    const p = platforms.find((x) => x.id === r.platformId);
    const code = p?.code ?? 'UNASSIGNED';
    const s = map.get(code) ?? { code, name: (p && PLATFORM_BY_CODE[p.code]) || p?.name || 'Unassigned', income: 0, incomeCount: 0, expense: 0, expenseCount: 0, topIncome: null, topExpense: null };
    const amount = n(r._sum.amount);
    const cat = { category: r.category, categoryAr: r.categoryAr ?? r.category, amount };
    if (r.type === 'INCOME') {
      s.income += amount;
      s.incomeCount += r._count._all;
      if (!s.topIncome || amount > s.topIncome.amount) s.topIncome = cat;
    } else {
      s.expense += amount;
      s.expenseCount += r._count._all;
      if (!s.topExpense || amount > s.topExpense.amount) s.topExpense = cat;
    }
    map.set(code, s);
  }
  return [...map.values()].sort((a, b) => b.income - a.income);
}
