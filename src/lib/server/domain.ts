import type { PrismaClient } from '@prisma/client';
import { derivedInvoiceStatus } from '../billing';

/**
 * Tenant-scoped reads for organizations, customers, subscriptions, invoices and payments.
 * EVERY query carries organizationId; callers get the id from the authenticated session, never from the request.
 * Enums are lower-cased for the UI; invoice "overdue" is derived from the due date.
 */

const iso = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);
const num = (v: { toString(): string }) => Number(v.toString());
const lc = <T extends string>(v: T) => v.toLowerCase();

export function mapInvoice(i: {
  id: string; number: string; customerId: string; subscriptionId: string | null; currency: 'LYD' | 'USD'; total: { toString(): string };
  issueDate: Date; dueDate: Date; paidDate: Date | null; status: 'DRAFT' | 'ISSUED' | 'PAID' | 'VOID'; note: string | null;
}, today: string) {
  const dueDate = iso(i.dueDate)!;
  return {
    id: i.id,
    number: i.number,
    customerId: i.customerId,
    subscriptionId: i.subscriptionId,
    currency: i.currency,
    total: num(i.total),
    issueDate: iso(i.issueDate)!,
    dueDate,
    paidDate: iso(i.paidDate),
    status: derivedInvoiceStatus({ status: i.status, dueDate }, today),
    note: i.note,
  };
}

export function mapPayment(p: {
  id: string; invoiceId: string; customerId: string; date: Date; amount: { toString(): string }; currency: 'LYD' | 'USD'; method: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING'; invoice?: { number: string };
}) {
  return {
    id: p.id,
    invoiceId: p.invoiceId,
    invoiceNumber: p.invoice?.number ?? '',
    customerId: p.customerId,
    date: iso(p.date)!,
    amount: num(p.amount),
    currency: p.currency,
    method: p.method,
    status: lc(p.status),
  };
}

export async function listOrganizations(prisma: PrismaClient) {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'asc' },
    include: { linkedCustomers: { select: { id: true } } },
  });
  return orgs.map((o) => ({
    id: o.id,
    name: o.name,
    kind: lc(o.kind),
    industry: o.industry,
    city: o.city,
    country: o.country,
    email: o.email,
    status: lc(o.status),
    createdAt: iso(o.createdAt)!,
    customerCount: o.linkedCustomers.length,
  }));
}

export async function listCustomers(prisma: PrismaClient, orgId: string) {
  const rows = await prisma.customer.findMany({
    where: { organizationId: orgId },
    orderBy: { displayName: 'asc' },
    include: { linkedOrganization: { select: { name: true } }, _count: { select: { subscriptions: true } } },
  });
  return rows.map(mapCustomer);
}

function mapCustomer(c: {
  id: string; type: string; displayName: string; businessName: string | null; linkedOrganizationId: string | null; email: string; phone: string | null;
  city: string | null; country: string | null; status: string; notes: string | null; createdAt: Date;
  linkedOrganization?: { name: string } | null; _count?: { subscriptions: number };
}) {
  return {
    id: c.id,
    type: lc(c.type),
    displayName: c.displayName,
    businessName: c.businessName,
    orgId: c.linkedOrganizationId,
    orgName: c.linkedOrganization?.name ?? null,
    email: c.email,
    phone: c.phone,
    city: c.city ?? '',
    country: c.country ?? '',
    status: lc(c.status),
    notes: c.notes,
    createdAt: iso(c.createdAt)!,
    subscriptionCount: c._count?.subscriptions ?? 0,
  };
}

const subInclude = {
  customer: { select: { displayName: true } },
  plan: { select: { id: true, name: true, product: { select: { id: true, name: true } } } },
} as const;

function mapSubscription(s: {
  id: string; customerId: string; planId: string; status: string; startDate: Date; nextRenewal: Date | null; canceledDate: Date | null;
  price: { toString(): string }; currency: 'LYD' | 'USD'; interval: string;
  customer: { displayName: string }; plan: { id: string; name: string; product: { id: string; name: string } };
}) {
  return {
    id: s.id,
    customerId: s.customerId,
    customerName: s.customer.displayName,
    planId: s.planId,
    planName: s.plan.name,
    productId: s.plan.product.id,
    productName: s.plan.product.name,
    status: lc(s.status),
    startDate: iso(s.startDate)!,
    nextRenewal: iso(s.nextRenewal),
    canceledDate: iso(s.canceledDate),
    price: num(s.price),
    currency: s.currency,
    interval: lc(s.interval),
  };
}

export async function listSubscriptions(prisma: PrismaClient, orgId: string) {
  const rows = await prisma.subscription.findMany({ where: { organizationId: orgId }, include: subInclude, orderBy: { startDate: 'desc' } });
  return rows.map(mapSubscription);
}

export async function customerDetail(prisma: PrismaClient, orgId: string, id: string, today: string) {
  // organizationId in the filter is the tenant boundary: another tenant's id returns null (404), never data.
  const c = await prisma.customer.findFirst({
    where: { id, organizationId: orgId },
    include: { linkedOrganization: { select: { name: true } }, _count: { select: { subscriptions: true } } },
  });
  if (!c) return null;
  const [subs, invoices, payments] = await Promise.all([
    prisma.subscription.findMany({ where: { organizationId: orgId, customerId: id }, include: subInclude, orderBy: { startDate: 'desc' } }),
    prisma.invoice.findMany({ where: { organizationId: orgId, customerId: id }, orderBy: { issueDate: 'desc' } }),
    prisma.billingPayment.findMany({ where: { organizationId: orgId, customerId: id }, include: { invoice: { select: { number: true } } }, orderBy: { date: 'desc' } }),
  ]);
  return {
    customer: mapCustomer(c),
    subscriptions: subs.map(mapSubscription),
    invoices: invoices.map((i) => mapInvoice(i, today)),
    payments: payments.map(mapPayment),
  };
}

export async function subscriptionDetail(prisma: PrismaClient, orgId: string, id: string, today: string) {
  const s = await prisma.subscription.findFirst({ where: { id, organizationId: orgId }, include: subInclude });
  if (!s) return null;
  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({ where: { organizationId: orgId, subscriptionId: id }, orderBy: { issueDate: 'desc' } }),
    prisma.billingPayment.findMany({
      where: { organizationId: orgId, invoice: { subscriptionId: id } },
      include: { invoice: { select: { number: true } } },
      orderBy: { date: 'desc' },
    }),
  ]);
  return { subscription: mapSubscription(s), invoices: invoices.map((i) => mapInvoice(i, today)), payments: payments.map(mapPayment) };
}
