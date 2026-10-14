import { guard, json, todayIso } from '@/lib/server/guard';
import { loadBillingRows } from '@/lib/server/billingData';
import { agingBuckets, invoicedCollected, monthlyNormalized, mrrByCurrency, perCurrency, type SubStatus } from '@/lib/billing';

export const dynamic = 'force-dynamic';

const STATUSES: SubStatus[] = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED'];

/** Subscription and billing analytics, calculated server-side (plans/category-3). */
export const GET = guard('reports:view', async (req, access, prisma) => {
  const today = todayIso(new URL(req.url).searchParams);
  const org = access.organizationId;

  const [rows, plans, products] = await Promise.all([
    loadBillingRows(prisma, org),
    prisma.plan.findMany({ where: { organizationId: org }, select: { id: true, productId: true } }),
    prisma.product.findMany({ where: { organizationId: org }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);

  const productOfPlan = new Map(plans.map((p) => [p.id, p.productId]));
  const mrr = mrrByCurrency(rows.subscriptions);

  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s.toLowerCase(), rows.subscriptions.filter((x) => x.status === s).length]));

  const perProduct = products.map((p) => {
    const subs = rows.subscriptions.filter((s) => productOfPlan.get(s.planId) === p.id);
    const m = perCurrency(() => 0);
    for (const s of subs) if (s.status === 'ACTIVE') m[s.currency] += monthlyNormalized(s.price, s.interval);
    return {
      id: p.id,
      name: p.name,
      total: subs.length,
      active: subs.filter((s) => s.status === 'ACTIVE').length,
      trial: subs.filter((s) => s.status === 'TRIAL').length,
      mrr: m,
    };
  });

  return json({
    asOf: today,
    mrr,
    arr: { LYD: mrr.LYD * 12, USD: mrr.USD * 12 },
    totalSubscriptions: rows.subscriptions.length,
    statusCounts,
    money: invoicedCollected(rows.invoices, rows.payments),
    aging: agingBuckets(rows.invoices, today),
    perProduct,
  });
});
