import type { Prisma, PrismaClient } from '@prisma/client';
import { derivedInvoiceStatus } from '../billing';
import { enumParam, type Paging } from './paging';

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

export async function listOrganizations(prisma: PrismaClient, orgId: string) {
  // Tenant boundary: the tenant itself, internal organizations, and organizations linked to THIS tenant's customers.
  const orgs = await prisma.organization.findMany({
    where: { OR: [{ id: orgId }, { kind: 'INTERNAL' }, { linkedCustomers: { some: { organizationId: orgId } } }] },
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

export function mapCustomer(c: {
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

export const subInclude = {
  customer: { select: { displayName: true } },
  plan: { select: { id: true, name: true, product: { select: { id: true, name: true } } } },
} as const;

export function mapSubscription(s: {
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


/* ------------------------------------------------------------------ server-side pages (search / filter / sort / paginate) */

const CUSTOMER_TYPES = ['INDIVIDUAL', 'SMALL_BUSINESS', 'MEDIUM_BUSINESS', 'ENTERPRISE', 'PUBLIC_SECTOR'] as const;
const ACTIVE_STATUSES = ['ACTIVE', 'INACTIVE'] as const;
const SUB_STATUSES = ['ACTIVE', 'TRIAL', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED'] as const;
const INTERVALS = ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'] as const;
const CURRENCIES = ['LYD', 'USD'] as const;

export const CUSTOMER_SORTS = ['name', 'type', 'city', 'subs', 'status', 'created'] as const;
export const SUBSCRIPTION_SORTS = ['id', 'customer', 'price', 'status', 'start', 'renewal'] as const;
export const INVOICE_SORTS = ['number', 'customer', 'total', 'issue', 'due', 'status'] as const;

export async function pageCustomers(prisma: PrismaClient, orgId: string, sp: URLSearchParams, p: Paging) {
  const where: Prisma.CustomerWhereInput = { organizationId: orgId };
  const type = enumParam(sp.get('type'), CUSTOMER_TYPES);
  const status = enumParam(sp.get('status'), ACTIVE_STATUSES);
  const city = sp.get('city');
  if (type) where.type = type;
  if (status) where.status = status;
  if (city) where.city = city;
  if (p.q) {
    const c = { contains: p.q, mode: 'insensitive' as const };
    where.OR = [{ displayName: c }, { businessName: c }, { email: c }, { id: c }, { phone: c }, { linkedOrganization: { is: { name: c } } }];
  }
  const dir = p.dir;
  const orderBy: Prisma.CustomerOrderByWithRelationInput[] =
    p.sort === 'type' ? [{ type: dir }, { displayName: 'asc' }]
    : p.sort === 'city' ? [{ city: dir }, { displayName: 'asc' }]
    : p.sort === 'status' ? [{ status: dir }, { displayName: 'asc' }]
    : p.sort === 'created' ? [{ createdAt: dir }, { id: 'asc' }]
    : p.sort === 'subs' ? [{ subscriptions: { _count: dir } }, { displayName: 'asc' }]
    : [{ displayName: dir }, { id: 'asc' }];

  const [rows, total, cities] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy,
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      include: { linkedOrganization: { select: { name: true } }, _count: { select: { subscriptions: true } } },
    }),
    prisma.customer.count({ where }),
    prisma.customer.groupBy({ by: ['city'], where: { organizationId: orgId }, _count: { _all: true }, orderBy: { city: 'asc' } }),
  ]);
  return {
    data: rows.map(mapCustomer),
    total,
    page: p.page,
    pageSize: p.pageSize,
    facets: { cities: cities.map((c) => c.city).filter((c): c is string => !!c) },
  };
}

export async function pageSubscriptions(prisma: PrismaClient, orgId: string, sp: URLSearchParams, p: Paging) {
  const where: Prisma.SubscriptionWhereInput = { organizationId: orgId };
  const status = enumParam(sp.get('status'), SUB_STATUSES);
  const interval = enumParam(sp.get('interval'), INTERVALS);
  const currency = enumParam(sp.get('currency'), CURRENCIES);
  const productId = sp.get('productId');
  const customerId = sp.get('customerId');
  if (status) where.status = status;
  if (interval) where.interval = interval;
  if (currency) where.currency = currency;
  if (customerId) where.customerId = customerId;
  if (productId) where.plan = { is: { productId } };
  if (p.q) {
    const c = { contains: p.q, mode: 'insensitive' as const };
    where.OR = [{ id: c }, { customer: { is: { displayName: c } } }, { customer: { is: { email: c } } }, { plan: { is: { name: c } } }, { plan: { is: { product: { is: { name: c } } } } }];
  }
  const dir = p.dir;
  const orderBy: Prisma.SubscriptionOrderByWithRelationInput[] =
    p.sort === 'id' ? [{ id: dir }]
    : p.sort === 'customer' ? [{ customer: { displayName: dir } }, { id: 'asc' }]
    : p.sort === 'price' ? [{ price: dir }, { id: 'asc' }]
    : p.sort === 'status' ? [{ status: dir }, { id: 'asc' }]
    : p.sort === 'renewal' ? [{ nextRenewal: { sort: dir, nulls: 'last' } }, { id: 'asc' }]
    : [{ startDate: dir }, { id: 'asc' }];

  const [rows, total, products] = await Promise.all([
    prisma.subscription.findMany({ where, orderBy, skip: (p.page - 1) * p.pageSize, take: p.pageSize, include: subInclude }),
    prisma.subscription.count({ where }),
    prisma.product.findMany({ where: { organizationId: orgId }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
  ]);
  return { data: rows.map(mapSubscription), total, page: p.page, pageSize: p.pageSize, facets: { products } };
}

export async function pageInvoices(prisma: PrismaClient, orgId: string, sp: URLSearchParams, p: Paging, today: string) {
  const where: Prisma.InvoiceWhereInput = { organizationId: orgId };
  const st = (sp.get('status') ?? '').toLowerCase();
  const todayDate = new Date(`${today}T00:00:00Z`);
  if (st === 'overdue') Object.assign(where, { status: 'ISSUED', dueDate: { lt: todayDate } });
  else if (st === 'issued') Object.assign(where, { status: 'ISSUED', dueDate: { gte: todayDate } });
  else if (st === 'paid') where.status = 'PAID';
  else if (st === 'void') where.status = 'VOID';
  else if (st === 'draft') where.status = 'DRAFT';
  const currency = enumParam(sp.get('currency'), CURRENCIES);
  const customerId = sp.get('customerId');
  if (currency) where.currency = currency;
  if (customerId) where.customerId = customerId;
  if (p.q) {
    const c = { contains: p.q, mode: 'insensitive' as const };
    where.OR = [{ number: c }, { id: c }, { customer: { is: { displayName: c } } }, { customer: { is: { email: c } } }];
  }
  const dir = p.dir;
  const orderBy: Prisma.InvoiceOrderByWithRelationInput[] =
    p.sort === 'number' ? [{ number: dir }]
    : p.sort === 'customer' ? [{ customer: { displayName: dir } }, { number: 'asc' }]
    : p.sort === 'total' ? [{ total: dir }, { number: 'asc' }]
    : p.sort === 'due' ? [{ dueDate: dir }, { number: 'asc' }]
    : p.sort === 'status' ? [{ status: dir }, { number: 'asc' }]
    : [{ issueDate: dir }, { number: 'asc' }];

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy, skip: (p.page - 1) * p.pageSize, take: p.pageSize, include: { customer: { select: { displayName: true } } } }),
    prisma.invoice.count({ where }),
  ]);
  return {
    data: rows.map((i) => ({ ...mapInvoice(i, today), customerName: i.customer.displayName })),
    total,
    page: p.page,
    pageSize: p.pageSize,
  };
}
