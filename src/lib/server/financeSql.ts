import { Prisma, type PrismaClient } from '@prisma/client';
import type { Currency, FinancialOverview, PaymentChannelBreakdown } from '@/types/dashboard';
import { calculateMoM } from '../calculations.ts';
import { endOfMonth } from '../billing.ts';
import { PLATFORM_BY_CODE } from '../mapApi.ts';
import { bucketFor, bucketIndex, bucketStarts, monthsTouched, overlapWithMonth, type Range } from '../period.ts';
import type { BreakdownItem, PlatformSummary, SeriesPoint } from './finance.ts';

/**
 * The whole finance side of the dashboard in a handful of SQL statements (about 7), for BOTH currencies at once.
 * The previous implementation issued ~25 queries per currency; on a Cloudflare Worker every Prisma call costs CPU
 * time, so the work is done by PostgreSQL with FILTER aggregates and only small result sets come back.
 * Definitions are identical to finance.ts (kept as the readable reference and compared in scripts/check-finance-sql.mjs).
 * Every query is scoped by organizationId; currencies are never combined.
 */

const CURRENCIES: Currency[] = ['LYD', 'USD'];
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number((v as { toString(): string }).toString()));

// Row filters (the recognition rules): see plans/category-3.
const INC = Prisma.sql`"type" = 'INCOME' AND "status" <> 'UPCOMING'`; // recognised income
const CASH = Prisma.sql`"type" = 'INCOME' AND "status" = 'PAID'`;
const PEND = Prisma.sql`"type" = 'INCOME' AND "status" = 'PENDING'`;
const COLL = Prisma.sql`"type" = 'INCOME' AND "category" = 'Customer Collection'`;
const EXPP = Prisma.sql`"type" = 'EXPENSE' AND "status" = 'PAID'`;
const UPC = Prisma.sql`"type" = 'EXPENSE' AND "status" = 'UPCOMING'`;

const inRange = (r: Range) => Prisma.sql`"transactionDate" BETWEEN ${d(r.from)} AND ${d(r.to)}`;
const sumIn = (cond: Prisma.Sql, r: Range) => Prisma.sql`COALESCE(SUM("amount") FILTER (WHERE ${cond} AND ${inRange(r)}), 0)`;
const countIn = (cond: Prisma.Sql, r: Range) => Prisma.sql`COUNT(*) FILTER (WHERE ${cond} AND ${inRange(r)})`;
const upTo = (cond: Prisma.Sql, to: string) => Prisma.sql`COALESCE(SUM("amount") FILTER (WHERE ${cond} AND "transactionDate" <= ${d(to)}), 0)`;

export interface MonthSpending {
  monthStart: string;
  monthEnd: string;
  spentToDate: number;
  spentCount: number;
  scheduledToMonthEnd: number;
  scheduledCount: number;
  projected: number;
  budgetCap: number;
  budgetConfigured: boolean;
}

export interface CurrencyFinance {
  overview: FinancialOverview;
  meta: { openingBalance: number; budgetCap: number; budgetConfigured: boolean; budgetProrated: boolean; isIllustrative: boolean };
  series: { bucket: 'day' | 'week' | 'month'; points: SeriesPoint[] };
  breakdown: { expensesByCategory: BreakdownItem[]; incomeByPlatform: BreakdownItem[] };
  spending: MonthSpending;
  platforms: PlatformSummary[];
}

/** Budget cap for a range from the (small) set of budget rows already loaded, prorated by days. */
function capFor(rows: { month: string; currency: Currency; amount: number }[], currency: Currency, range: Range) {
  const months = new Set(monthsTouched(range));
  let cap = 0;
  let prorated = false;
  let configured = false;
  for (const r of rows) {
    if (r.currency !== currency || !months.has(r.month)) continue;
    configured = true;
    const { overlap, monthDays } = overlapWithMonth(range, r.month);
    if (overlap < monthDays) prorated = true;
    cap += (r.amount * overlap) / monthDays;
  }
  return { cap, prorated, configured };
}

export async function financeAll(prisma: PrismaClient, org: string, range: Range, prev: Range, today: string, platformId: string | null = null): Promise<Record<Currency, CurrencyFinance>> {
  const plat = platformId ? Prisma.sql`AND "platformId" = ${platformId}` : Prisma.empty;
  const monthStart = `${today.slice(0, 8)}01`;
  const monthEnd = endOfMonth(today);
  const horizon = [range.to, prev.to, monthEnd].sort().at(-1)!;
  const floor = [range.from, prev.from].sort()[0];
  const budgetMonths = Array.from(new Set([...monthsTouched(range), ...monthsTouched(prev), monthStart]));
  const monthRange: Range = { from: monthStart, to: monthEnd };

  const [totals, daily, groups, channels, budgets, openings, platforms] = await Promise.all([
    // A. every headline sum, both ranges, cumulative nets and month spending: one row per currency
    prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      SELECT "currency"::text AS currency,
        ${sumIn(INC, range)} AS inc_r, ${sumIn(CASH, range)} AS cash_r, ${sumIn(EXPP, range)} AS exp_r, ${sumIn(COLL, range)} AS coll_r, ${sumIn(PEND, range)} AS pend_r, ${sumIn(UPC, range)} AS upc_r,
        ${sumIn(INC, prev)} AS inc_p, ${sumIn(CASH, prev)} AS cash_p, ${sumIn(EXPP, prev)} AS exp_p, ${sumIn(COLL, prev)} AS coll_p,
        ${upTo(INC, range.to)} - ${upTo(EXPP, range.to)} AS net_r,
        ${upTo(INC, prev.to)} - ${upTo(EXPP, prev.to)} AS net_p,
        ${sumIn(EXPP, monthRange)} AS m_spent, ${countIn(EXPP, monthRange)} AS m_spent_n,
        COALESCE(SUM("amount") FILTER (WHERE "type" = 'EXPENSE' AND "status" IN ('UPCOMING', 'PENDING') AND "transactionDate" <= ${d(monthEnd)}), 0) AS m_sched,
        COUNT(*) FILTER (WHERE "type" = 'EXPENSE' AND "status" IN ('UPCOMING', 'PENDING') AND "transactionDate" <= ${d(monthEnd)}) AS m_sched_n
      FROM "FinancialTransaction"
      WHERE "organizationId" = ${org} AND "transactionDate" <= ${d(horizon)} ${plat}
      GROUP BY "currency"`),
    // B. daily recognised income and paid expenses for the chart (range and previous period)
    prisma.$queryRaw<{ currency: Currency; day: string; inc: unknown; exp: unknown }[]>(Prisma.sql`
      SELECT "currency"::text AS currency, "transactionDate"::text AS day,
        COALESCE(SUM("amount") FILTER (WHERE ${INC}), 0) AS inc, COALESCE(SUM("amount") FILTER (WHERE ${EXPP}), 0) AS exp
      FROM "FinancialTransaction"
      WHERE "organizationId" = ${org} ${plat} AND ("transactionDate" BETWEEN ${d(range.from)} AND ${d(range.to)} OR "transactionDate" BETWEEN ${d(prev.from)} AND ${d(prev.to)})
      GROUP BY 1, 2`),
    // C. platform x category groups: income by platform, expenses by category and the per-platform report
    prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      SELECT "currency"::text AS currency, "platformId" AS platform_id, "category" AS category, "categoryAr" AS category_ar,
        ${sumIn(INC, range)} AS inc_r, ${countIn(INC, range)} AS inc_r_n, ${sumIn(EXPP, range)} AS exp_r, ${countIn(EXPP, range)} AS exp_r_n,
        ${sumIn(INC, prev)} AS inc_p, ${sumIn(EXPP, prev)} AS exp_p
      FROM "FinancialTransaction"
      WHERE "organizationId" = ${org} ${plat} AND ("transactionDate" BETWEEN ${d(range.from)} AND ${d(range.to)} OR "transactionDate" BETWEEN ${d(prev.from)} AND ${d(prev.to)})
      GROUP BY 1, 2, 3, 4`),
    // D. payment channels (paid only, selected range)
    prisma.$queryRaw<{ currency: Currency; type: 'INCOME' | 'EXPENSE'; method: string; amount: unknown; n: bigint }[]>(Prisma.sql`
      SELECT "currency"::text AS currency, "type"::text AS type, "paymentMethod"::text AS method, SUM("amount") AS amount, COUNT(*) AS n
      FROM "FinancialTransaction"
      WHERE "organizationId" = ${org} ${plat} AND "status" = 'PAID' AND ${inRange(range)}
      GROUP BY 1, 2, 3`),
    // E. company-wide budgets for the months involved
    prisma.$queryRaw<{ month: string; currency: Currency; amount: unknown }[]>(Prisma.sql`
      SELECT "month"::text AS month, "currency"::text AS currency, "amount" AS amount
      FROM "MonthlyBudget"
      WHERE "organizationId" = ${org} AND ${platformId ? Prisma.sql`"platformId" = ${platformId}` : Prisma.sql`"platformId" IS NULL`} AND "month" IN (${Prisma.join(budgetMonths.map(d))})`),
    // F. latest opening balance per currency on or before the end of the range
    prisma.$queryRaw<{ currency: Currency; amount: unknown }[]>(Prisma.sql`
      SELECT DISTINCT ON ("currency") "currency"::text AS currency, "amount" AS amount
      FROM "OpeningBalance"
      WHERE "organizationId" = ${org} AND "effectiveDate" <= ${d(range.to)}
      ORDER BY "currency", "effectiveDate" DESC`),
    prisma.platform.findMany({ where: { organizationId: org }, select: { id: true, name: true, code: true } }),
  ]);
  void floor;

  const budgetRows = budgets.map((b) => ({ month: b.month, currency: b.currency, amount: num(b.amount) }));
  const bucket = bucketFor(range);
  const starts = bucketStarts(range, bucket);
  const prevStarts = bucketStarts(prev, bucket);
  const platformById = new Map(platforms.map((p) => [p.id, p]));
  const platformLabel = (id: string | null) => {
    const p = id ? platformById.get(id) : undefined;
    return { key: p?.code ?? 'UNASSIGNED', label: (p && PLATFORM_BY_CODE[p.code]) || p?.name || 'Unassigned' };
  };

  const out = {} as Record<Currency, CurrencyFinance>;
  for (const currency of CURRENCIES) {
    const t = totals.find((r) => r.currency === currency) ?? {};
    const g = (k: string) => num((t as Record<string, unknown>)[k]);
    const cur = { income: g('inc_r'), cashCollected: g('cash_r'), expenses: g('exp_r'), collections: g('coll_r'), pending: g('pend_r'), upcoming: g('upc_r') };
    const old = { income: g('inc_p'), cashCollected: g('cash_p'), expenses: g('exp_p'), collections: g('coll_p') };
    const base = platformId ? 0 : num(openings.find((o) => o.currency === currency)?.amount);
    const cap = capFor(budgetRows, currency, range);
    const capPrev = capFor(budgetRows, currency, prev);
    const remaining = cap.configured ? cap.cap - cur.expenses : 0;
    const remainingPrev = capPrev.configured ? capPrev.cap - old.expenses : 0;

    const channel = (type: 'INCOME' | 'EXPENSE'): PaymentChannelBreakdown[] => {
      const rows = channels.filter((r) => r.currency === currency && r.type === type);
      const total = rows.reduce((s, r) => s + num(r.amount), 0);
      return rows
        .map((r) => ({ paymentMethod: r.method as PaymentChannelBreakdown['paymentMethod'], amount: num(r.amount), percentage: total > 0 ? (num(r.amount) / total) * 100 : 0, transactionCount: Number(r.n) }))
        .sort((a, b) => b.amount - a.amount);
    };

    const overview: FinancialOverview = {
      totalIncome: calculateMoM(cur.income, old.income, currency),
      totalExpenses: calculateMoM(cur.expenses, old.expenses, currency),
      netResult: calculateMoM(cur.income - cur.expenses, old.income - old.expenses, currency),
      availableCash: calculateMoM(base + g('net_r'), base + g('net_p'), currency),
      remainingBudget: calculateMoM(remaining, remainingPrev, currency),
      customerCollections: calculateMoM(cur.collections, old.collections, currency),
      upcomingObligationsTotal: cur.upcoming,
      cashCollected: calculateMoM(cur.cashCollected, old.cashCollected, currency),
      pendingIncomeTotal: cur.pending,
      budgetOverrun: remaining < 0 ? Math.abs(remaining) : 0,
      incomeByPaymentMethod: channel('INCOME'),
      expensesByPaymentMethod: channel('EXPENSE'),
    };

    // chart series
    const rowsC = daily.filter((r) => r.currency === currency);
    const fill = (st: string[], r: Range) => {
      const income = st.map(() => 0);
      const expenses = st.map(() => 0);
      for (const row of rowsC) {
        if (row.day < r.from || row.day > r.to) continue;
        const i = bucketIndex(st, row.day);
        income[i] += num(row.inc);
        expenses[i] += num(row.exp);
      }
      return { income, expenses };
    };
    const curS = fill(starts, range);
    const oldS = fill(prevStarts, prev);
    const points: SeriesPoint[] = starts.map((start, i) => ({
      start,
      income: curS.income[i],
      expenses: curS.expenses[i],
      prevStart: prevStarts[i] ?? null,
      prevIncome: i < prevStarts.length ? oldS.income[i] : null,
      prevExpenses: i < prevStarts.length ? oldS.expenses[i] : null,
    }));

    // breakdowns and per-platform summary from the platform x category groups
    const gc = groups.filter((r) => r.currency === currency);
    const expensesByCategory = new Map<string, BreakdownItem>();
    const incomeByPlatform = new Map<string, BreakdownItem>();
    const platMap = new Map<string, PlatformSummary>();
    for (const r of gc) {
      const category = r.category as string;
      const categoryAr = (r.category_ar as string | null) ?? category;
      const expR = num(r.exp_r);
      const expP = num(r.exp_p);
      if (expR || expP) {
        const it = expensesByCategory.get(category) ?? { key: category, label: category, labelAr: categoryAr, current: 0, previous: 0 };
        it.current += expR;
        it.previous += expP;
        expensesByCategory.set(category, it);
      }
      const pl = platformLabel(r.platform_id as string | null);
      const incR = num(r.inc_r);
      const incP = num(r.inc_p);
      if (incR || incP) {
        const it = incomeByPlatform.get(pl.key) ?? { key: pl.key, label: pl.label, labelAr: pl.label, current: 0, previous: 0 };
        it.current += incR;
        it.previous += incP;
        incomeByPlatform.set(pl.key, it);
      }
      if (incR || expR || Number(r.inc_r_n) || Number(r.exp_r_n)) {
        const s = platMap.get(pl.key) ?? { code: pl.key, name: pl.label, income: 0, incomeCount: 0, expense: 0, expenseCount: 0, topIncome: null, topExpense: null };
        if (Number(r.inc_r_n)) {
          s.income += incR;
          s.incomeCount += Number(r.inc_r_n);
          if (!s.topIncome || incR > s.topIncome.amount) s.topIncome = { category, categoryAr, amount: incR };
        }
        if (Number(r.exp_r_n)) {
          s.expense += expR;
          s.expenseCount += Number(r.exp_r_n);
          if (!s.topExpense || expR > s.topExpense.amount) s.topExpense = { category, categoryAr, amount: expR };
        }
        platMap.set(pl.key, s);
      }
    }
    const sortItems = (m: Map<string, BreakdownItem>) => [...m.values()].sort((a, b) => b.current + b.previous - (a.current + a.previous) || a.key.localeCompare(b.key));

    const monthCap = capFor(budgetRows, currency, monthRange);
    const spentToDate = g('m_spent');
    const scheduled = g('m_sched');

    out[currency] = {
      overview,
      meta: { openingBalance: base, budgetCap: cap.configured ? cap.cap : 0, budgetConfigured: cap.configured, budgetProrated: cap.prorated, isIllustrative: true },
      series: { bucket, points },
      breakdown: { expensesByCategory: sortItems(expensesByCategory), incomeByPlatform: sortItems(incomeByPlatform) },
      spending: {
        monthStart,
        monthEnd,
        spentToDate,
        spentCount: Number((t as Record<string, unknown>).m_spent_n ?? 0),
        scheduledToMonthEnd: scheduled,
        scheduledCount: Number((t as Record<string, unknown>).m_sched_n ?? 0),
        projected: spentToDate + scheduled,
        budgetCap: monthCap.configured ? monthCap.cap : 0,
        budgetConfigured: monthCap.configured,
      },
      platforms: [...platMap.values()].sort((a, b) => b.income - a.income),
    };
  }
  return out;
}

/** Spent vs budget for a range, both currencies (alerts): two small queries. */
export async function budgetUsage(prisma: PrismaClient, org: string, range: Range): Promise<Record<Currency, { spent: number; cap: number; configured: boolean }>> {
  const months = monthsTouched(range);
  const [spent, budgets] = await Promise.all([
    prisma.$queryRaw<{ currency: Currency; spent: unknown }[]>(Prisma.sql`
      SELECT "currency"::text AS currency, COALESCE(SUM("amount"), 0) AS spent
      FROM "FinancialTransaction"
      WHERE "organizationId" = ${org} AND ${EXPP} AND ${inRange(range)}
      GROUP BY 1`),
    prisma.$queryRaw<{ month: string; currency: Currency; amount: unknown }[]>(Prisma.sql`
      SELECT "month"::text AS month, "currency"::text AS currency, "amount" AS amount
      FROM "MonthlyBudget"
      WHERE "organizationId" = ${org} AND "platformId" IS NULL AND "month" IN (${Prisma.join(months.map(d))})`),
  ]);
  const rows = budgets.map((b) => ({ month: b.month, currency: b.currency, amount: num(b.amount) }));
  const out = {} as Record<Currency, { spent: number; cap: number; configured: boolean }>;
  for (const c of CURRENCIES) {
    const cap = capFor(rows, c, range);
    out[c] = { spent: num(spent.find((s) => s.currency === c)?.spent), cap: cap.cap, configured: cap.configured };
  }
  return out;
}
