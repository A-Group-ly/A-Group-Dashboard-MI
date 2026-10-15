import { guard, json, todayIso } from '@/lib/server/guard';
import { customerDetail, mapCustomer } from '@/lib/server/domain';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

const TYPES = ['INDIVIDUAL', 'SMALL_BUSINESS', 'MEDIUM_BUSINESS', 'ENTERPRISE', 'PUBLIC_SECTOR'] as const;
const STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export const GET = guard<{ id: string }>('customers:view', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const data = await customerDetail(prisma, access.organizationId, id, todayIso(new URL(req.url).searchParams));
  return data ? json(data) : json({ error: 'Not found' }, 404);
});

/** Edit a customer or (de)activate it. Only fields present in the body change. */
export const PATCH = guard<{ id: string }>('customers:write', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const existing = await prisma.customer.findFirst({ where: { id, organizationId: org } });
  if (!existing) return json({ error: 'Not found' }, 404);

  const r = new Reader(await readJson(req));
  const data: Record<string, unknown> = {};
  if (r.has('type')) data.type = r.oneOf('type', TYPES);
  if (r.has('status')) data.status = r.oneOf('status', STATUSES);
  if (r.has('displayName')) data.displayName = r.str('displayName', { min: 2, max: 120, required: true });
  if (r.has('businessName')) data.businessName = r.nullableStr('businessName', 160);
  if (r.has('email')) data.email = r.email('email');
  if (r.has('phone')) data.phone = r.nullableStr('phone', 40);
  if (r.has('city')) data.city = r.nullableStr('city', 80);
  if (r.has('country')) data.country = r.nullableStr('country', 80);
  if (r.has('notes')) data.notes = r.nullableStr('notes', 1000);
  if (!r.ok) return json({ error: 'Validation failed', fields: r.errors }, 422);
  if (Object.keys(data).length === 0) return json({ error: 'Nothing to change' }, 422);

  if (typeof data.email === 'string' && data.email !== existing.email.toLowerCase()) {
    const dup = await prisma.customer.findFirst({ where: { organizationId: org, email: { equals: data.email, mode: 'insensitive' }, NOT: { id } }, select: { id: true } });
    if (dup) return json({ error: 'A customer with this email already exists', fields: { email: 'duplicate' } }, 409);
  }

  const wasStatus = existing.status;
  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.update({
      where: { id },
      data,
      include: { linkedOrganization: { select: { name: true } }, _count: { select: { subscriptions: true } } },
    });
    const action = data.status && data.status !== wasStatus ? (data.status === 'INACTIVE' ? 'customer.deactivate' : 'customer.reactivate') : 'customer.update';
    await auditOp(tx, access, action, 'Customer', id, `${action === 'customer.update' ? 'Updated' : data.status === 'INACTIVE' ? 'Deactivated' : 'Reactivated'} customer ${c.displayName}`);
    return c;
  });
  return json(mapCustomer(updated));
});
