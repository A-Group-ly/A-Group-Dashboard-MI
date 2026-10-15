import { can } from '@/lib/permissions';
import { guard, json } from '@/lib/server/guard';

export const dynamic = 'force-dynamic';

/** Global search (command palette): a few best matches per record type, limited to what the role may see. */
export const GET = guard(null, async (req, access, prisma) => {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return json({ customers: [], subscriptions: [], invoices: [] });
  const org = access.organizationId;
  const c = { contains: q, mode: 'insensitive' as const };
  const [customers, subscriptions, invoices] = await Promise.all([
    can(access.role, 'customers:view')
      ? prisma.customer.findMany({ where: { organizationId: org, OR: [{ displayName: c }, { email: c }, { id: c }, { businessName: c }] }, select: { id: true, displayName: true, email: true, type: true }, orderBy: { displayName: 'asc' }, take: 5 })
      : [],
    can(access.role, 'subscriptions:view')
      ? prisma.subscription.findMany({ where: { organizationId: org, OR: [{ id: c }, { customer: { is: { displayName: c } } }] }, select: { id: true, status: true, customer: { select: { displayName: true } }, plan: { select: { name: true } } }, orderBy: { startDate: 'desc' }, take: 5 })
      : [],
    can(access.role, 'invoices:view')
      ? prisma.invoice.findMany({ where: { organizationId: org, OR: [{ number: c }, { customer: { is: { displayName: c } } }] }, select: { id: true, number: true, status: true, total: true, currency: true, customerId: true, customer: { select: { displayName: true } } }, orderBy: { issueDate: 'desc' }, take: 5 })
      : [],
  ]);
  return json({
    customers: customers.map((x) => ({ id: x.id, name: x.displayName, email: x.email, type: x.type.toLowerCase() })),
    subscriptions: subscriptions.map((x) => ({ id: x.id, customer: x.customer.displayName, plan: x.plan.name, status: x.status.toLowerCase() })),
    invoices: invoices.map((x) => ({ id: x.id, number: x.number, customer: x.customer.displayName, customerId: x.customerId, total: Number(x.total.toString()), currency: x.currency, status: x.status.toLowerCase() })),
  });
});
