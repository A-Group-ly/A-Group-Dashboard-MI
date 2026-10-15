import { guard, json, todayIso } from '@/lib/server/guard';
import { mapInvoice } from '@/lib/server/domain';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';
import { accountForCollection, platformForProduct } from '@/lib/billingDates';

export const dynamic = 'force-dynamic';

const METHODS = {
  bank_transfer: { label: 'Bank transfer (simulated)', pm: 'BANK_TRANSFER' },
  card: { label: 'Card on file (simulated)', pm: 'LOCAL_CARD' },
  cash: { label: 'Cash at branch (simulated)', pm: 'CASH' },
  wallet: { label: 'Digital wallet (simulated)', pm: 'DIGITAL_WALLET' },
} as const;

/**
 * Record a SIMULATED payment for the full invoice amount. One atomic step: the invoice moves ISSUED -> PAID (so a
 * double click cannot pay twice), a successful payment row is written, the matching income transaction is booked
 * (so the finance dashboard reconciles with billing) and the audit entry is stored. No payment provider is contacted.
 */
export const POST = guard<{ id: string }>('payments:record', async (req, access, prisma, ctx) => {
  const { id } = await ctx.params;
  const org = access.organizationId;
  const today = todayIso();
  const r = new Reader(await readJson(req));
  const methodKey = r.oneOf('method', Object.keys(METHODS) as (keyof typeof METHODS)[]);
  const date = r.date('date', false) ?? today;
  if (!r.ok || !methodKey) return json({ error: 'Validation failed', fields: r.errors }, 422);

  const inv = await prisma.invoice.findFirst({
    where: { id, organizationId: org },
    include: { customer: { select: { displayName: true } }, subscription: { select: { plan: { select: { productId: true } } } } },
  });
  if (!inv) return json({ error: 'Not found' }, 404);
  const issue = inv.issueDate.toISOString().slice(0, 10);
  if (date < issue) return json({ error: 'Payment date is before the invoice was issued', fields: { date: 'before_issue' } }, 422);
  if (date > today) return json({ error: 'Payment date is in the future', fields: { date: 'in_future' } }, 422);

  const m = METHODS[methodKey];
  const pm = m.pm === 'LOCAL_CARD' && inv.currency === 'USD' ? 'INTERNATIONAL_CARD' : m.pm;
  const paidAt = new Date(`${date}T00:00:00Z`);

  const result = await prisma.$transaction(async (tx) => {
    const res = await tx.invoice.updateMany({ where: { id, organizationId: org, status: 'ISSUED' }, data: { status: 'PAID', paidDate: paidAt } });
    if (res.count !== 1) return null;
    const payment = await tx.billingPayment.create({
      data: { organizationId: org, invoiceId: id, customerId: inv.customerId, date: paidAt, amount: inv.total, currency: inv.currency, method: m.label, status: 'SUCCEEDED' },
    });
    await tx.financialTransaction.create({
      data: {
        organizationId: org,
        description: `Subscription payment ${inv.number} (simulated)`,
        descriptionAr: `دفعة اشتراك ${inv.number} (محاكاة)`,
        amount: inv.total,
        currency: inv.currency,
        type: 'INCOME',
        status: 'PAID',
        category: 'Customer Collection',
        categoryAr: 'تحصيلات العملاء',
        transactionDate: paidAt,
        reference: inv.number,
        platformId: platformForProduct(inv.subscription?.plan.productId),
        paymentMethod: pm,
        accountId: accountForCollection(inv.currency, pm),
      },
    });
    await auditOp(tx, access, 'payment.record', 'Invoice', id, `Recorded simulated payment for ${inv.number} (${inv.total.toString()} ${inv.currency}, ${m.label})`);
    return { payment, invoice: await tx.invoice.findFirst({ where: { id, organizationId: org } }) };
  });
  if (!result?.invoice) return json({ error: `Cannot record a payment for an invoice that is ${inv.status.toLowerCase()}` }, 409);
  return json({ invoice: { ...mapInvoice(result.invoice, today), customerName: inv.customer.displayName }, paymentId: result.payment.id }, 201);
});
