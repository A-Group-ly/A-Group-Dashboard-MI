import { guard, json, todayIso } from '@/lib/server/guard';
import { SUBSCRIPTION_SORTS, mapSubscription, pageSubscriptions, subInclude } from '@/lib/server/domain';
import { parsePaging } from '@/lib/server/paging';
import { CSV_MAX_ROWS, canExport, csvResponse } from '@/lib/server/csvResponse';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';
import { initialRenewal } from '@/lib/billingDates';

export const dynamic = 'force-dynamic';

export const GET = guard('subscriptions:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const paging = parsePaging(sp, SUBSCRIPTION_SORTS, 'start', 'desc');
  if (sp.get('format') === 'csv') {
    if (!canExport(access)) return json({ error: 'Forbidden' }, 403);
    const r = await pageSubscriptions(prisma, access.organizationId, sp, { ...paging, page: 1, pageSize: CSV_MAX_ROWS });
    return csvResponse(
      'a-group-subscriptions.csv',
      ['ID', 'Customer', 'Product', 'Plan', 'Currency', 'Price', 'Interval', 'Status', 'Start', 'NextRenewal'],
      r.data.map((s) => [s.id, s.customerName, s.productName, s.planName, s.currency, s.price, s.interval, s.status, s.startDate, s.nextRenewal])
    );
  }
  return json(await pageSubscriptions(prisma, access.organizationId, sp, paging));
});

/** Start a subscription: price / currency / interval are snapshotted from the plan (x units). */
export const POST = guard('subscriptions:write', async (req, access, prisma) => {
  const org = access.organizationId;
  const r = new Reader(await readJson(req));
  const customerId = r.str('customerId', { max: 80, required: true });
  const planId = r.str('planId', { max: 80, required: true });
  const startDate = r.date('startDate', false) ?? todayIso();
  const units = r.int('units', { min: 1, max: 1000 }, false) ?? 1;
  if (!r.ok || !customerId || !planId) return json({ error: 'Validation failed', fields: r.errors }, 422);

  const [customer, plan] = await Promise.all([
    prisma.customer.findFirst({ where: { id: customerId, organizationId: org } }),
    prisma.plan.findFirst({ where: { id: planId, organizationId: org } }),
  ]);
  if (!customer) return json({ error: 'Customer not found', fields: { customerId: 'not_found' } }, 404);
  if (!plan) return json({ error: 'Plan not found', fields: { planId: 'not_found' } }, 404);
  if (customer.status !== 'ACTIVE') return json({ error: 'The customer is inactive', fields: { customerId: 'inactive' } }, 409);
  if (plan.status !== 'ACTIVE') return json({ error: 'The plan is inactive', fields: { planId: 'inactive' } }, 409);

  const price = Math.round(Number(plan.price.toString()) * units * 100) / 100;
  const created = await prisma.$transaction(async (tx) => {
    const s = await tx.subscription.create({
      data: {
        organizationId: org,
        customerId,
        planId,
        status: plan.trialDays > 0 ? 'TRIAL' : 'ACTIVE',
        startDate: new Date(`${startDate}T00:00:00Z`),
        nextRenewal: new Date(`${initialRenewal(startDate, plan.interval, plan.trialDays)}T00:00:00Z`),
        price,
        currency: plan.currency,
        interval: plan.interval,
      },
      include: subInclude,
    });
    await auditOp(tx, access, 'subscription.create', 'Subscription', s.id, `Started ${plan.name} for ${customer.displayName} (${price} ${plan.currency})`);
    return s;
  });
  return json(mapSubscription(created), 201);
});
