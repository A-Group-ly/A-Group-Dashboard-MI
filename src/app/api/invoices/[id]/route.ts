import { guard, json, todayIso } from '@/lib/server/guard';
import { mapInvoice } from '@/lib/server/domain';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

/** Void an unpaid invoice. A paid invoice is never voided here (it would orphan a collection). */
export const PATCH = guard<{ id: string }>('invoices:write', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const r = new Reader(await readJson(req));
  const action = r.oneOf('action', ['void'] as const);
  if (!r.ok || !action) return json({ error: 'Validation failed', fields: r.errors }, 422);

  const inv = await prisma.invoice.findFirst({ where: { id, organizationId: org }, include: { customer: { select: { displayName: true } } } });
  if (!inv) return json({ error: 'Not found' }, 404);

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.invoice.updateMany({ where: { id, organizationId: org, status: { in: ['ISSUED', 'DRAFT'] } }, data: { status: 'VOID' } });
    if (res.count !== 1) return null;
    await auditOp(tx, access, 'invoice.void', 'Invoice', id, `Voided ${inv.number} (${inv.customer.displayName})`);
    return tx.invoice.findFirst({ where: { id, organizationId: org } });
  });
  if (!updated) return json({ error: `Cannot void an invoice that is ${inv.status.toLowerCase()}` }, 409);
  return json({ ...mapInvoice(updated, todayIso()), customerName: inv.customer.displayName });
});
