import { guard, json, todayIso } from '@/lib/server/guard';
import { customerDetail } from '@/lib/server/domain';

export const dynamic = 'force-dynamic';

export const GET = guard<{ id: string }>('customers:view', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const data = await customerDetail(prisma, access.organizationId, id, todayIso(new URL(req.url).searchParams));
  return data ? json(data) : json({ error: 'Not found' }, 404);
});
