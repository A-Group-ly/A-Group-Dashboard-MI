import { guard, json } from '@/lib/server/guard';

export const dynamic = 'force-dynamic';

/** Financial accounts and platforms (for the transaction form pickers). Tenant-scoped. */
export const GET = guard('transactions:view', async (_req, access, prisma) => {
  const [accounts, platforms] = await Promise.all([
    prisma.financialAccount.findMany({ where: { organizationId: access.organizationId, active: true }, orderBy: [{ currency: 'asc' }, { name: 'asc' }], select: { id: true, name: true, currency: true, type: true } }),
    prisma.platform.findMany({ where: { organizationId: access.organizationId, active: true }, orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
  ]);
  return json({ accounts, platforms });
});
