import { guard, json, todayIso } from '@/lib/server/guard';
import { mapInvoice, mapPayment } from '@/lib/server/domain';
import { Reader, readJson } from '@/lib/server/validate';
import { voidInvoice } from '@/lib/server/invoiceOps';

export const dynamic = 'force-dynamic';

/** One invoice with everything the printable document needs (tenant-scoped). */
export const GET = guard<{ id: string }>('invoices:view', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const today = todayIso(new URL(req.url).searchParams);
  const inv = await prisma.invoice.findFirst({
    where: { id, organizationId: org },
    include: {
      customer: { select: { id: true, displayName: true, businessName: true, email: true, phone: true, city: true, country: true, type: true } },
      subscription: { select: { id: true, interval: true, price: true, plan: { select: { name: true, product: { select: { name: true } } } } } },
      payments: { include: { invoice: { select: { number: true } } }, orderBy: { date: 'asc' } },
      organization: { select: { name: true, email: true, city: true, country: true } },
    },
  });
  if (!inv) return json({ error: 'Not found' }, 404);
  return json({
    invoice: mapInvoice(inv, today),
    issuer: { name: inv.organization.name, email: inv.organization.email, city: inv.organization.city, country: inv.organization.country },
    customer: { ...inv.customer, type: inv.customer.type.toLowerCase() },
    subscription: inv.subscription
      ? { id: inv.subscription.id, interval: inv.subscription.interval.toLowerCase(), planName: inv.subscription.plan.name, productName: inv.subscription.plan.product.name }
      : null,
    payments: inv.payments.map(mapPayment),
  });
});

/** Void an unpaid invoice. A paid invoice is never voided here (it would orphan a collection). */
export const PATCH = guard<{ id: string }>('invoices:write', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const r = new Reader(await readJson(req));
  const action = r.oneOf('action', ['void'] as const);
  if (!r.ok || !action) return json({ error: 'Validation failed', fields: r.errors }, 422);
  const res = await voidInvoice(prisma, access, id, todayIso());
  return res.ok ? json(res.data) : json({ error: res.error }, res.status);
});
