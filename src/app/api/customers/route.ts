import { guard, json } from '@/lib/server/guard';
import { listCustomers } from '@/lib/server/domain';

export const dynamic = 'force-dynamic';

export const GET = guard('customers:view', async (_req, access, prisma) => json({ data: await listCustomers(prisma, access.organizationId) }));
