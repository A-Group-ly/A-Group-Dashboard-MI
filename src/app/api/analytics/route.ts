import { guard, json, todayIso } from '@/lib/server/guard';
import { billingAnalytics } from '@/lib/server/billingSql';

export const dynamic = 'force-dynamic';

/** Subscription and billing analytics, aggregated by PostgreSQL (plans/category-3). Currencies never combined. */
export const GET = guard('reports:view', async (req, access, prisma) => {
  const today = todayIso(new URL(req.url).searchParams);
  return json({ asOf: today, ...(await billingAnalytics(prisma, access.organizationId, today)) });
}, { cacheMs: 60000 });
