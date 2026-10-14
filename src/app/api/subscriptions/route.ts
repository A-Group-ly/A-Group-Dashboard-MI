import { guard, json } from '@/lib/server/guard';
import { listSubscriptions } from '@/lib/server/domain';

export const dynamic = 'force-dynamic';

export const GET = guard('subscriptions:view', async (_req, access, prisma) => json({ data: await listSubscriptions(prisma, access.organizationId) }));
