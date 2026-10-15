import type { PrismaClient } from '@prisma/client';
import { accountForCollection, platformForProduct } from '../billingDates.ts';
import { auditOp } from './audit';
import type { Access } from './access';
import { mapInvoice } from './domain';

/**
 * Invoice operations shared by the single-invoice routes and the bulk route, so there is exactly one implementation
 * of the rules: paying is atomic (ISSUED -> PAID, payment row, income transaction, audit), voiding refuses paid
 * invoices, reminders are simulated and limited to one per invoice per 24 hours.
 */

export type OpResult<T = Record<string, unknown>> = { ok: true; data: T } | { ok: false; status: number; error: string; fields?: Record<string, string> };

export const PAYMENT_METHODS = {
  bank_transfer: { label: 'Bank transfer (simulated)', pm: 'BANK_TRANSFER' },
  card: { label: 'Card on file (simulated)', pm: 'LOCAL_CARD' },
  cash: { label: 'Cash at branch (simulated)', pm: 'CASH' },
  wallet: { label: 'Digital wallet (simulated)', pm: 'DIGITAL_WALLET' },
} as const;
export type PaymentMethodKey = keyof typeof PAYMENT_METHODS;

const fail = (status: number, error: string, fields?: Record<string, string>): OpResult<never> => ({ ok: false, status, error, fields });

export async function payInvoice(prisma: PrismaClient, access: Access, id: string, methodKey: PaymentMethodKey, date: string, today: string): Promise<OpResult> {
  const org = access.organizationId;
  const inv = await prisma.invoice.findFirst({
    where: { id, organizationId: org },
    include: { customer: { select: { displayName: true } }, subscription: { select: { plan: { select: { productId: true } } } } },
  });
  if (!inv) return fail(404, 'Not found');
  const issue = inv.issueDate.toISOString().slice(0, 10);
  if (date < issue) return fail(422, 'Payment date is before the invoice was issued', { date: 'before_issue' });
  if (date > today) return fail(422, 'Payment date is in the future', { date: 'in_future' });

  const m = PAYMENT_METHODS[methodKey];
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
  if (!result?.invoice) return fail(409, `Cannot record a payment for an invoice that is ${inv.status.toLowerCase()}`);
  return { ok: true, data: { invoice: { ...mapInvoice(result.invoice, today), customerName: inv.customer.displayName }, paymentId: result.payment.id } };
}

export async function voidInvoice(prisma: PrismaClient, access: Access, id: string, today: string): Promise<OpResult> {
  const org = access.organizationId;
  const inv = await prisma.invoice.findFirst({ where: { id, organizationId: org }, include: { customer: { select: { displayName: true } } } });
  if (!inv) return fail(404, 'Not found');
  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.invoice.updateMany({ where: { id, organizationId: org, status: { in: ['ISSUED', 'DRAFT'] } }, data: { status: 'VOID' } });
    if (res.count !== 1) return null;
    await auditOp(tx, access, 'invoice.void', 'Invoice', id, `Voided ${inv.number} (${inv.customer.displayName})`);
    return tx.invoice.findFirst({ where: { id, organizationId: org } });
  });
  if (!updated) return fail(409, `Cannot void an invoice that is ${inv.status.toLowerCase()}`);
  return { ok: true, data: { ...mapInvoice(updated, today), customerName: inv.customer.displayName } };
}

export async function remindInvoice(prisma: PrismaClient, access: Access, id: string, today: string): Promise<OpResult> {
  const org = access.organizationId;
  const inv = await prisma.invoice.findFirst({ where: { id, organizationId: org }, include: { customer: { select: { displayName: true } } } });
  if (!inv) return fail(404, 'Not found');
  if (inv.status !== 'ISSUED' || inv.dueDate.toISOString().slice(0, 10) >= today) return fail(409, 'Only overdue invoices can be chased');
  const recent = await prisma.auditLog.findFirst({ where: { organizationId: org, action: 'invoice.reminder', entityId: id, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } }, select: { id: true } });
  if (recent) return fail(409, 'A reminder was already recorded in the last 24 hours');
  await prisma.$transaction(async (tx) => {
    await auditOp(tx, access, 'invoice.reminder', 'Invoice', id, `Recorded payment reminder for ${inv.number} (${inv.customer.displayName}), simulated`);
  });
  return { ok: true, data: { id, reminded: true } };
}
