import { guard, json, todayIso } from '@/lib/server/guard';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

/**
 * Record a payment reminder for an overdue invoice. SIMULATED: nothing is emailed or messaged; the reminder is
 * written to the audit trail so the team can see who chased the customer and when.
 */
export const POST = guard<{ id: string }>('invoices:write', async (_req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const inv = await prisma.invoice.findFirst({ where: { id, organizationId: org }, include: { customer: { select: { displayName: true } } } });
  if (!inv) return json({ error: 'Not found' }, 404);
  const today = todayIso();
  if (inv.status !== 'ISSUED' || inv.dueDate.toISOString().slice(0, 10) >= today) return json({ error: 'Only overdue invoices can be chased' }, 409);

  const recent = await prisma.auditLog.findFirst({ where: { organizationId: org, action: 'invoice.reminder', entityId: id, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } }, select: { id: true } });
  if (recent) return json({ error: 'A reminder was already recorded in the last 24 hours' }, 409);

  await prisma.$transaction(async (tx) => {
    await auditOp(tx, access, 'invoice.reminder', 'Invoice', id, `Recorded payment reminder for ${inv.number} (${inv.customer.displayName}), simulated`);
  });
  return json({ id, reminded: true });
});
