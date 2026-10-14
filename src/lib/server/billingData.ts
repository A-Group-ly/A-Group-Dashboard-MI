import type { PrismaClient } from '@prisma/client';
import type { InvoiceRow, PaymentRow, SubscriptionRow } from '../billing';

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);
const num = (v: { toString(): string }) => Number(v.toString());

/** Lightweight, tenant-scoped rows used by the billing calculations. */
export async function loadBillingRows(prisma: PrismaClient, orgId: string) {
  const [invoices, payments, subscriptions] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      select: { id: true, number: true, customerId: true, subscriptionId: true, total: true, currency: true, issueDate: true, dueDate: true, paidDate: true, status: true },
      orderBy: { issueDate: 'desc' },
    }),
    prisma.billingPayment.findMany({
      where: { organizationId: orgId },
      select: { id: true, invoiceId: true, customerId: true, amount: true, currency: true, date: true, status: true, method: true },
      orderBy: { date: 'desc' },
    }),
    prisma.subscription.findMany({
      where: { organizationId: orgId },
      select: { id: true, customerId: true, planId: true, status: true, price: true, currency: true, interval: true, startDate: true, nextRenewal: true, canceledDate: true },
    }),
  ]);

  return {
    invoices: invoices.map((i) => ({
      ...i,
      total: num(i.total),
      issueDate: iso(i.issueDate)!,
      dueDate: iso(i.dueDate)!,
      paidDate: iso(i.paidDate),
    })),
    payments: payments.map((p) => ({ ...p, amount: num(p.amount), date: iso(p.date)! })),
    subscriptions: subscriptions.map((s) => ({
      ...s,
      price: num(s.price),
      startDate: iso(s.startDate)!,
      nextRenewal: iso(s.nextRenewal),
      canceledDate: iso(s.canceledDate),
    })),
  };
}

export type BillingRows = Awaited<ReturnType<typeof loadBillingRows>>;

// Compile-time check that the rows satisfy the pure-calculation types.
export const _typeCheck = (r: BillingRows): { i: InvoiceRow[]; p: PaymentRow[]; s: SubscriptionRow[] } => ({
  i: r.invoices,
  p: r.payments,
  s: r.subscriptions,
});
