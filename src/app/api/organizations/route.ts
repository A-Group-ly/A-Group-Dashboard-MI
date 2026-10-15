import { guard, json } from '@/lib/server/guard';
import { listOrganizations } from '@/lib/server/domain';

export const dynamic = 'force-dynamic';

export const GET = guard('organizations:view', async (_req, access, prisma) => json({ data: await listOrganizations(prisma, access.organizationId) }));
