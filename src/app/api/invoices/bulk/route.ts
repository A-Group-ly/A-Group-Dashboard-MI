import { can } from '@/lib/permissions';
import { guard, json, todayIso } from '@/lib/server/guard';
import { Reader, readJson } from '@/lib/server/validate';
import { PAYMENT_METHODS, payInvoice, remindInvoice, voidInvoice, type PaymentMethodKey } from '@/lib/server/invoiceOps';

export const dynamic = 'force-dynamic';

/** Small batches keep each request cheap (the free Worker has a tight CPU budget); the browser sends several. */
const MAX_PER_REQUEST = 10;
const ACTIONS = ['pay', 'remind', 'void'] as const;

/**
 * Apply one action to several invoices. Every invoice goes through the same single-invoice rules and its own
 * transaction, so one failure never affects the others; the response lists the outcome per invoice.
 */
export const POST = guard('invoices:view', async (req, access, prisma) => {
  const body = await readJson(req);
  const r = new Reader(body);
  const action = r.oneOf('action', ACTIONS);
  const method = r.oneOf('method', Object.keys(PAYMENT_METHODS) as PaymentMethodKey[], false);
  const today = todayIso();
  const date = r.date('date', false) ?? today;
  const rawIds = (body as { ids?: unknown })?.ids;
  const ids = Array.isArray(rawIds) ? Array.from(new Set(rawIds.filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 80))) : [];
  if (ids.length === 0) r.errors.ids = 'required';
  if (ids.length > MAX_PER_REQUEST) r.errors.ids = 'too_many';
  if (action === 'pay' && !method) r.errors.method = 'required';
  if (!r.ok || !action) return json({ error: 'Validation failed', fields: r.errors }, 422);

  // Same permissions as the single-invoice actions.
  if (action === 'pay' && !can(access.role, 'payments:record')) return json({ error: 'Forbidden' }, 403);
  if (action !== 'pay' && !can(access.role, 'invoices:write')) return json({ error: 'Forbidden' }, 403);

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const id of ids) {
    const res = action === 'pay' ? await payInvoice(prisma, access, id, method!, date, today) : action === 'void' ? await voidInvoice(prisma, access, id, today) : await remindInvoice(prisma, access, id, today);
    results.push(res.ok ? { id, ok: true } : { id, ok: false, error: res.error });
  }
  return json({ results, succeeded: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length });
});
