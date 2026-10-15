import { guard, json, todayIso } from '@/lib/server/guard';
import { INVOICE_SORTS, mapInvoice, pageInvoices } from '@/lib/server/domain';
import { parsePaging } from '@/lib/server/paging';
import { CSV_MAX_ROWS, canExport, csvResponse } from '@/lib/server/csvResponse';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';
import { defaultDueDate, newInvoiceNumber } from '@/lib/billingDates';

export const dynamic = 'force-dynamic';

export const GET = guard('invoices:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const today = todayIso(sp);
  const paging = parsePaging(sp, INVOICE_SORTS, 'issue', 'desc');
  if (sp.get('format') === 'csv') {
    if (!canExport(access)) return json({ error: 'Forbidden' }, 403);
    const r = await pageInvoices(prisma, access.organizationId, sp, { ...paging, page: 1, pageSize: CSV_MAX_ROWS }, today);
    return csvResponse(
      'a-group-invoices.csv',
      ['Number', 'Customer', 'Currency', 'Total', 'Issued', 'Due', 'Paid', 'Status'],
      r.data.map((i) => [i.number, i.customerName, i.currency, i.total, i.issueDate, i.dueDate, i.paidDate, i.status])
    );
  }
  return json(await pageInvoices(prisma, access.organizationId, sp, paging, today));
});

/**
 * Issue an invoice, either for a subscription (amount and currency come from the subscription unless an amount is
 * given) or as a one-off for a customer. Simulated only: no payment provider is ever contacted.
 */
export const POST = guard('invoices:write', async (req, access, prisma) => {
  const org = access.organizationId;
  const today = todayIso();
  const r = new Reader(await readJson(req));
  const subscriptionId = r.str('subscriptionId', { max: 80 });
  const customerIdIn = r.str('customerId', { max: 80 });
  const currencyIn = r.oneOf('currency', ['LYD', 'USD'] as const, false);
  const amountIn = r.money('amount', false);
  const issueDate = r.date('issueDate', false) ?? today;
  const dueDate = r.date('dueDate', false) ?? defaultDueDate(issueDate);
  const note = r.str('note', { max: 300 });
  if (!subscriptionId && !customerIdIn) r.errors.subscriptionId = 'required';
  if (!subscriptionId && !currencyIn) r.errors.currency = 'required';
  if (!subscriptionId && amountIn === undefined) r.errors.amount = 'required';
  if (issueDate > today) r.errors.issueDate = 'in_future';
  if (dueDate < issueDate) r.errors.dueDate = 'before_issue';
  if (!r.ok) return json({ error: 'Validation failed', fields: r.errors }, 422);

  let customerId = customerIdIn!;
  let currency = currencyIn!;
  let total = amountIn!;
  if (subscriptionId) {
    const sub = await prisma.subscription.findFirst({ where: { id: subscriptionId, organizationId: org } });
    if (!sub) return json({ error: 'Subscription not found', fields: { subscriptionId: 'not_found' } }, 404);
    if (sub.status === 'CANCELED' || sub.status === 'EXPIRED') return json({ error: 'The subscription has ended', fields: { subscriptionId: 'ended' } }, 409);
    customerId = sub.customerId;
    currency = sub.currency;
    total = amountIn ?? Number(sub.price.toString());
    const dup = await prisma.invoice.findFirst({ where: { organizationId: org, subscriptionId, issueDate: new Date(`${issueDate}T00:00:00Z`), status: { not: 'VOID' } }, select: { number: true } });
    if (dup) return json({ error: `An invoice for this subscription and date already exists (${dup.number})` }, 409);
  }
  const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId: org }, select: { id: true, displayName: true } });
  if (!customer) return json({ error: 'Customer not found', fields: { customerId: 'not_found' } }, 404);

  for (let attempt = 0; attempt < 3; attempt++) {
    const number = newInvoiceNumber(issueDate);
    try {
      const created = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
          data: {
            organizationId: org,
            number,
            customerId,
            subscriptionId: subscriptionId ?? null,
            currency,
            total,
            issueDate: new Date(`${issueDate}T00:00:00Z`),
            dueDate: new Date(`${dueDate}T00:00:00Z`),
            status: 'ISSUED',
            note: note ?? null,
          },
        });
        await auditOp(tx, access, 'invoice.create', 'Invoice', inv.id, `Issued ${number} to ${customer.displayName} (${total} ${currency})`);
        return inv;
      });
      return json({ ...mapInvoice(created, today), customerName: customer.displayName }, 201);
    } catch (e) {
      if ((e as { code?: string })?.code !== 'P2002') throw e; // number collision: try another suffix
    }
  }
  return json({ error: 'Could not allocate an invoice number, please retry' }, 409);
});
