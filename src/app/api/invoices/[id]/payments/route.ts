import { guard, json, todayIso } from '@/lib/server/guard';
import { Reader, readJson } from '@/lib/server/validate';
import { PAYMENT_METHODS, payInvoice, type PaymentMethodKey } from '@/lib/server/invoiceOps';

export const dynamic = 'force-dynamic';

/**
 * Record a SIMULATED payment for the full invoice amount (atomic: invoice PAID, payment row, income transaction,
 * audit entry). No payment provider is contacted. See invoiceOps.ts.
 */
export const POST = guard<{ id: string }>('payments:record', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const today = todayIso();
  const r = new Reader(await readJson(req));
  const method = r.oneOf('method', Object.keys(PAYMENT_METHODS) as PaymentMethodKey[]);
  const date = r.date('date', false) ?? today;
  if (!r.ok || !method) return json({ error: 'Validation failed', fields: r.errors }, 422);

  const res = await payInvoice(prisma, access, id, method, date, today);
  return res.ok ? json(res.data, 201) : json({ error: res.error, fields: res.fields }, res.status);
});
