import { guard, json, todayIso } from '@/lib/server/guard';
import { subscriptionDetail } from '@/lib/server/domain';

export const dynamic = 'force-dynamic';

export const GET = guard<{ id: string }>('subscriptions:view', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const data = await subscriptionDetail(prisma, access.organizationId, id, todayIso(new URL(req.url).searchParams));
  return data ? json(data) : json({ error: 'Not found' }, 404);
});
