import { guard, json, todayIso } from '@/lib/server/guard';
import { mapSubscription, subInclude, subscriptionDetail } from '@/lib/server/domain';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';
import { nextRenewalAfter } from '@/lib/billingDates';

export const dynamic = 'force-dynamic';

const ACTIONS = ['pause', 'resume', 'cancel'] as const;
type SubStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
/** Which current statuses each action may start from. */
const ALLOWED_FROM: Record<(typeof ACTIONS)[number], SubStatus[]> = {
  pause: ['ACTIVE', 'TRIAL', 'PAST_DUE'],
  resume: ['PAUSED'],
  cancel: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PAUSED'],
};

export const GET = guard<{ id: string }>('subscriptions:view', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const data = await subscriptionDetail(prisma, access.organizationId, id, todayIso(new URL(req.url).searchParams));
  return data ? json(data) : json({ error: 'Not found' }, 404);
});

/** Pause, resume or cancel. Invalid transitions return 409; the check and the change are one atomic update. */
export const PATCH = guard<{ id: string }>('subscriptions:write', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const sub = await prisma.subscription.findFirst({ where: { id, organizationId: org }, include: subInclude });
  if (!sub) return json({ error: 'Not found' }, 404);

  const r = new Reader(await readJson(req));
  const action = r.oneOf('action', ACTIONS);
  const date = r.date('date', false) ?? todayIso();
  if (!r.ok || !action) return json({ error: 'Validation failed', fields: r.errors }, 422);
  const startIso = sub.startDate.toISOString().slice(0, 10);
  if (action === 'cancel' && date < startIso) return json({ error: 'Cancellation date is before the start date', fields: { date: 'before_start' } }, 422);

  const data =
    action === 'pause'
      ? { status: 'PAUSED' as const }
      : action === 'resume'
        ? { status: 'ACTIVE' as const, nextRenewal: new Date(`${nextRenewalAfter(date, sub.interval)}T00:00:00Z`) }
        : { status: 'CANCELED' as const, canceledDate: new Date(`${date}T00:00:00Z`), nextRenewal: null };

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.subscription.updateMany({ where: { id, organizationId: org, status: { in: ALLOWED_FROM[action] } }, data });
    if (res.count !== 1) return null;
    await auditOp(tx, access, `subscription.${action}`, 'Subscription', id, `${action[0].toUpperCase()}${action.slice(1)} subscription ${id} (${sub.customer.displayName})`);
    return tx.subscription.findFirst({ where: { id, organizationId: org }, include: subInclude });
  });
  if (!updated) return json({ error: `Cannot ${action} a subscription that is ${sub.status.toLowerCase()}` }, 409);
  return json(mapSubscription(updated));
});
