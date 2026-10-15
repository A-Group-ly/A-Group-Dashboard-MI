import { guard, json } from '@/lib/server/guard';
import { CUSTOMER_SORTS, mapCustomer, pageCustomers } from '@/lib/server/domain';
import { parsePaging } from '@/lib/server/paging';
import { CSV_MAX_ROWS, canExport, csvResponse } from '@/lib/server/csvResponse';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

const TYPES = ['INDIVIDUAL', 'SMALL_BUSINESS', 'MEDIUM_BUSINESS', 'ENTERPRISE', 'PUBLIC_SECTOR'] as const;

/** Paginated, searchable, filterable, sortable customer list (tenant-scoped); `format=csv` exports the same filter. */
export const GET = guard('customers:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const paging = parsePaging(sp, CUSTOMER_SORTS, 'name');
  if (sp.get('format') === 'csv') {
    if (!canExport(access)) return json({ error: 'Forbidden' }, 403);
    const r = await pageCustomers(prisma, access.organizationId, sp, { ...paging, page: 1, pageSize: CSV_MAX_ROWS });
    return csvResponse(
      'a-group-customers.csv',
      ['ID', 'Name', 'Type', 'Organization', 'Email', 'Phone', 'City', 'Status', 'Subscriptions', 'Created'],
      r.data.map((c) => [c.id, c.displayName, c.type, c.orgName, c.email, c.phone, c.city, c.status, c.subscriptionCount, c.createdAt])
    );
  }
  return json(await pageCustomers(prisma, access.organizationId, sp, paging));
});

/** Create a customer. The tenant comes from the session, never from the body. */
export const POST = guard('customers:write', async (req, access, prisma) => {
  const r = new Reader(await readJson(req));
  const type = r.oneOf('type', TYPES);
  const displayName = r.str('displayName', { min: 2, max: 120, required: true });
  const businessName = r.str('businessName', { max: 160 });
  const email = r.email('email');
  const phone = r.str('phone', { max: 40 });
  const city = r.str('city', { max: 80 });
  const country = r.str('country', { max: 80 });
  const notes = r.str('notes', { max: 1000 });
  if (!r.ok || !type || !displayName || !email) return json({ error: 'Validation failed', fields: r.errors }, 422);

  const dup = await prisma.customer.findFirst({ where: { organizationId: access.organizationId, email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
  if (dup) return json({ error: 'A customer with this email already exists', fields: { email: 'duplicate' } }, 409);

  const [created] = await prisma.$transaction(async (tx) => {
    const c = await tx.customer.create({
      data: { organizationId: access.organizationId, type, displayName, businessName: businessName ?? null, email, phone: phone ?? null, city: city ?? null, country: country ?? 'Libya', notes: notes ?? null },
      include: { linkedOrganization: { select: { name: true } }, _count: { select: { subscriptions: true } } },
    });
    await auditOp(tx, access, 'customer.create', 'Customer', c.id, `Created customer ${displayName}`);
    return [c];
  });
  return json(mapCustomer(created), 201);
});
