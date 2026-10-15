import { Prisma, type PrismaClient } from '@prisma/client';
import type { Cur, FinancialPosition, Interval, SubStatus, AgingBucket } from '../billing.ts';
import { endOfMonth, monthlyNormalized, perCurrency } from '../billing.ts';
import type { Range } from '../period.ts';
import { subscriptionScope, productScope } from './platformScope.ts';

/**
 * Billing aggregates computed by PostgreSQL (SUM / COUNT ... FILTER / GROUP BY), so a request never loads
 * thousands of invoice and payment rows into the Worker. Definitions are identical to src/lib/billing.ts
 * (which stays as the readable reference and is unit-tested); every query is scoped by organizationId.
 * Currencies are never combined: every result is keyed by currency.
 */

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number((v as { toString(): string }).toString()));
const CURRENCIES: Cur[] = ['LYD', 'USD'];
const dateParam = (iso: string) => new Date(`${iso}T00:00:00Z`);

interface InvoiceAgg {
  currency: Cur;
  outstanding: unknown;
  outstanding_n: bigint;
  overdue: unknown;
  overdue_n: bigint;
  not_yet_due: unknown;
  due_by_end: unknown;
  due_by_end_n: bigint;
  due_later: unknown;
}
interface PaymentAgg {
  currency: Cur;
  paid: unknown;
  paid_n: bigint;
  paid_prev: unknown;
}

/** Financial position for BOTH currencies: two queries in total. */
export async function financialPositions(
  prisma: PrismaClient,
  org: string,
  range: Range,
  previousRange: Range,
  today: string,
  platformId: string | null = null
): Promise<Record<Cur, FinancialPosition>> {
  const monthEnd = endOfMonth(today);
  const invScope = subscriptionScope(org, platformId, Prisma.sql`"subscriptionId"`);
  const payScope = platformId ? Prisma.sql`"invoiceId" IN (SELECT i."id" FROM "Invoice" i WHERE i."organizationId" = ${org} AND ${subscriptionScope(org, platformId, Prisma.sql`i."subscriptionId"`)})` : Prisma.sql`TRUE`;
  const [inv, pay] = await Promise.all([
    prisma.$queryRaw<InvoiceAgg[]>(Prisma.sql`
      SELECT "currency"::text AS currency,
        COALESCE(SUM("total") FILTER (WHERE "issueDate" <= ${dateParam(range.to)}), 0) AS outstanding,
        COUNT(*) FILTER (WHERE "issueDate" <= ${dateParam(range.to)}) AS outstanding_n,
        COALESCE(SUM("total") FILTER (WHERE "issueDate" <= ${dateParam(range.to)} AND "dueDate" < ${dateParam(today)}), 0) AS overdue,
        COUNT(*) FILTER (WHERE "issueDate" <= ${dateParam(range.to)} AND "dueDate" < ${dateParam(today)}) AS overdue_n,
        COALESCE(SUM("total") FILTER (WHERE "issueDate" <= ${dateParam(range.to)} AND "dueDate" >= ${dateParam(today)}), 0) AS not_yet_due,
        COALESCE(SUM("total") FILTER (WHERE "issueDate" <= ${dateParam(range.to)} AND "dueDate" <= ${dateParam(monthEnd)}), 0) AS due_by_end,
        COUNT(*) FILTER (WHERE "issueDate" <= ${dateParam(range.to)} AND "dueDate" <= ${dateParam(monthEnd)}) AS due_by_end_n,
        COALESCE(SUM("total") FILTER (WHERE "issueDate" <= ${dateParam(range.to)} AND "dueDate" <= ${dateParam(monthEnd)} AND "dueDate" >= ${dateParam(today)}), 0) AS due_later
      FROM "Invoice"
      WHERE "organizationId" = ${org} AND "status" = 'ISSUED' AND ${invScope}
      GROUP BY "currency"`),
    prisma.$queryRaw<PaymentAgg[]>(Prisma.sql`
      SELECT "currency"::text AS currency,
        COALESCE(SUM("amount") FILTER (WHERE "date" BETWEEN ${dateParam(range.from)} AND ${dateParam(range.to)}), 0) AS paid,
        COUNT(*) FILTER (WHERE "date" BETWEEN ${dateParam(range.from)} AND ${dateParam(range.to)}) AS paid_n,
        COALESCE(SUM("amount") FILTER (WHERE "date" BETWEEN ${dateParam(previousRange.from)} AND ${dateParam(previousRange.to)}), 0) AS paid_prev
      FROM "BillingPayment"
      WHERE "organizationId" = ${org} AND "status" = 'SUCCEEDED' AND ${payScope}
      GROUP BY "currency"`),
  ]);

  const out = {} as Record<Cur, FinancialPosition>;
  for (const currency of CURRENCIES) {
    const i = inv.find((r) => r.currency === currency);
    const p = pay.find((r) => r.currency === currency);
    out[currency] = {
      currency,
      paid: num(p?.paid),
      paidPrevious: num(p?.paid_prev),
      paidCount: Number(p?.paid_n ?? 0),
      outstanding: num(i?.outstanding),
      outstandingCount: Number(i?.outstanding_n ?? 0),
      overdue: num(i?.overdue),
      overdueCount: Number(i?.overdue_n ?? 0),
      notYetDue: num(i?.not_yet_due),
      expectedByMonthEnd: num(i?.due_by_end),
      expectedByMonthEndCount: Number(i?.due_by_end_n ?? 0),
      dueLaterThisMonth: num(i?.due_later),
      monthEnd,
    };
  }
  return out;
}

/** Subscription / invoicing analytics (reports page): a handful of grouped queries, constant-size results. */
export async function billingAnalytics(prisma: PrismaClient, org: string, today: string) {
  const [subs, invoiced, collected, aging, products] = await Promise.all([
    prisma.$queryRaw<{ status: SubStatus; currency: Cur; interval: Interval; product_id: string; n: bigint; price_sum: unknown }[]>(Prisma.sql`
      SELECT s."status"::text AS status, s."currency"::text AS currency, s."interval"::text AS interval, pl."productId" AS product_id,
             COUNT(*) AS n, COALESCE(SUM(s."price"), 0) AS price_sum
      FROM "Subscription" s JOIN "Plan" pl ON pl."id" = s."planId"
      WHERE s."organizationId" = ${org}
      GROUP BY 1, 2, 3, 4`),
    prisma.$queryRaw<{ currency: Cur; invoiced: unknown; outstanding: unknown }[]>(Prisma.sql`
      SELECT "currency"::text AS currency,
             COALESCE(SUM("total"), 0) AS invoiced,
             COALESCE(SUM("total") FILTER (WHERE "status" = 'ISSUED'), 0) AS outstanding
      FROM "Invoice" WHERE "organizationId" = ${org} AND "status" IN ('ISSUED', 'PAID')
      GROUP BY "currency"`),
    prisma.$queryRaw<{ currency: Cur; collected: unknown }[]>(Prisma.sql`
      SELECT "currency"::text AS currency, COALESCE(SUM("amount"), 0) AS collected
      FROM "BillingPayment" WHERE "organizationId" = ${org} AND "status" = 'SUCCEEDED'
      GROUP BY "currency"`),
    prisma.$queryRaw<{ currency: Cur; bucket: AgingBucket; total: unknown }[]>(Prisma.sql`
      SELECT "currency"::text AS currency,
        CASE WHEN (${dateParam(today)}::date - "dueDate") <= 0 THEN 'notDue'
             WHEN (${dateParam(today)}::date - "dueDate") <= 30 THEN 'd30'
             WHEN (${dateParam(today)}::date - "dueDate") <= 60 THEN 'd60'
             WHEN (${dateParam(today)}::date - "dueDate") <= 90 THEN 'd90'
             ELSE 'd90p' END AS bucket,
        COALESCE(SUM("total"), 0) AS total
      FROM "Invoice" WHERE "organizationId" = ${org} AND "status" = 'ISSUED'
      GROUP BY 1, 2`),
    prisma.product.findMany({ where: { organizationId: org }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  const mrr = perCurrency(() => 0);
  const statusCounts: Record<string, number> = Object.fromEntries((['ACTIVE', 'TRIAL', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED'] as SubStatus[]).map((s) => [s.toLowerCase(), 0]));
  let totalSubscriptions = 0;
  const perProductMap = new Map<string, { total: number; active: number; trial: number; mrr: Record<Cur, number> }>();
  for (const r of subs) {
    const n = Number(r.n);
    totalSubscriptions += n;
    statusCounts[r.status.toLowerCase()] += n;
    const p = perProductMap.get(r.product_id) ?? { total: 0, active: 0, trial: 0, mrr: perCurrency(() => 0) };
    p.total += n;
    if (r.status === 'ACTIVE') {
      p.active += n;
      // Normalising the SUM is exact: the factor depends only on the interval, which is part of the grouping.
      const m = monthlyNormalized(num(r.price_sum), r.interval);
      mrr[r.currency] += m;
      p.mrr[r.currency] += m;
    }
    if (r.status === 'TRIAL') p.trial += n;
    perProductMap.set(r.product_id, p);
  }

  const money = perCurrency(() => ({ invoiced: 0, collected: 0, outstanding: 0 }));
  for (const r of invoiced) {
    money[r.currency].invoiced = num(r.invoiced);
    money[r.currency].outstanding = num(r.outstanding);
  }
  for (const r of collected) money[r.currency].collected = num(r.collected);

  const agingOut: Record<AgingBucket, Record<Cur, number>> = {
    notDue: perCurrency(() => 0),
    d30: perCurrency(() => 0),
    d60: perCurrency(() => 0),
    d90: perCurrency(() => 0),
    d90p: perCurrency(() => 0),
  };
  for (const r of aging) agingOut[r.bucket][r.currency] = num(r.total);

  return {
    mrr,
    arr: { LYD: mrr.LYD * 12, USD: mrr.USD * 12 },
    totalSubscriptions,
    statusCounts,
    money,
    aging: agingOut,
    perProduct: products.map((p) => {
      const x = perProductMap.get(p.id) ?? { total: 0, active: 0, trial: 0, mrr: perCurrency(() => 0) };
      return { id: p.id, name: p.name, total: x.total, active: x.active, trial: x.trial, mrr: x.mrr };
    }),
  };
}

export interface Pulse {
  customers: number;
  activeCustomers: number;
  newCustomers: number;
  subscriptions: { active: number; trial: number; pastDue: number; paused: number };
  mrr: Record<Cur, number>;
}

/** Headline business counters for the "live pulse" strip: two grouped queries, optionally scoped to one platform. */
export async function pulseStats(prisma: PrismaClient, org: string, range: Range, platformId: string | null = null): Promise<Pulse> {
  const scope = productScope(platformId);
  const toExclusive = new Date(dateParam(range.to).getTime() + 86400000);
  const [subs, cust] = await Promise.all([
    prisma.$queryRaw<{ status: string; currency: Cur; interval: Interval; n: bigint; price_sum: unknown }[]>(Prisma.sql`
      SELECT s."status"::text AS status, s."currency"::text AS currency, s."interval"::text AS interval, COUNT(*) AS n, COALESCE(SUM(s."price"), 0) AS price_sum
      FROM "Subscription" s JOIN "Plan" pl ON pl."id" = s."planId"
      WHERE s."organizationId" = ${org} AND ${scope}
      GROUP BY 1, 2, 3`),
    // With a platform selected, "customers" means customers subscribed to that platform's products.
    prisma.$queryRaw<{ total: bigint; active: bigint; created: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE c."status" = 'ACTIVE') AS active,
             COUNT(*) FILTER (WHERE c."createdAt" >= ${dateParam(range.from)} AND c."createdAt" < ${toExclusive}) AS created
      FROM "Customer" c
      WHERE c."organizationId" = ${org} AND ${
        platformId
          ? Prisma.sql`c."id" IN (SELECT s."customerId" FROM "Subscription" s JOIN "Plan" pl ON pl."id" = s."planId" WHERE s."organizationId" = ${org} AND ${scope})`
          : Prisma.sql`TRUE`
      }`),
  ]);
  const count = (status: string) => subs.filter((x) => x.status === status).reduce((a, x) => a + Number(x.n), 0);
  const mrr = perCurrency(() => 0);
  for (const r of subs) if (r.status === 'ACTIVE') mrr[r.currency] += monthlyNormalized(num(r.price_sum), r.interval);
  const c = cust[0];
  return {
    customers: Number(c?.total ?? 0),
    activeCustomers: Number(c?.active ?? 0),
    newCustomers: Number(c?.created ?? 0),
    subscriptions: { active: count('ACTIVE'), trial: count('TRIAL'), pastDue: count('PAST_DUE'), paused: count('PAUSED') },
    mrr,
  };
}
