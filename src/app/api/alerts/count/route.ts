import { guard, json, todayIso } from '@/lib/server/guard';
import { alertCounts } from '@/lib/server/activity';

export const dynamic = 'force-dynamic';

/** Counts only (four indexed COUNT queries, kept for 30 s): drives the notification bell. */
export const GET = guard('alerts:view', async (req, access, prisma) => json(await alertCounts(prisma, access.organizationId, todayIso(new URL(req.url).searchParams))), { cacheMs: 30000 });
