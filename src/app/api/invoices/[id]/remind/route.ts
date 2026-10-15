import { guard, json, todayIso } from '@/lib/server/guard';
import { remindInvoice } from '@/lib/server/invoiceOps';

export const dynamic = 'force-dynamic';

/** Record a payment reminder for an overdue invoice. SIMULATED: nothing is sent; it is written to the audit trail. */
export const POST = guard<{ id: string }>('invoices:write', async (_req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const res = await remindInvoice(prisma, access, id, todayIso());
  return res.ok ? json(res.data) : json({ error: res.error }, res.status);
});
