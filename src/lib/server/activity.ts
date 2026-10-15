import type { PrismaClient } from '@prisma/client';

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

export interface ActivityItem {
  date: string;
  kind: string;
  ref: string;
  customerName: string | null;
  status: string | null;
  href: string;
}

/** Latest business events (subscriptions started / canceled, invoices, payments). Informational, not a security log. */
export async function recentActivity(prisma: PrismaClient, org: string, today: string, take = 14): Promise<ActivityItem[]> {
  const day = new Date(`${today}T00:00:00Z`);
  const per = Math.max(6, take);
  const [subs, invs, pays] = await Promise.all([
    prisma.subscription.findMany({ where: { organizationId: org, startDate: { lte: day } }, select: { id: true, startDate: true, canceledDate: true, customer: { select: { displayName: true } } }, orderBy: { startDate: 'desc' }, take: per }),
    prisma.invoice.findMany({ where: { organizationId: org, status: { in: ['ISSUED', 'PAID'] }, issueDate: { lte: day } }, select: { number: true, status: true, issueDate: true, customerId: true, customer: { select: { displayName: true } } }, orderBy: { issueDate: 'desc' }, take: per }),
    prisma.billingPayment.findMany({ where: { organizationId: org, date: { lte: day } }, select: { id: true, status: true, date: true, customerId: true, invoice: { select: { number: true } }, customer: { select: { displayName: true } } }, orderBy: { date: 'desc' }, take: per }),
  ]);
  return [
    ...subs.map((s) => ({ date: iso(s.startDate), kind: 'subscriptionCreated', ref: s.id, customerName: s.customer.displayName, status: null as string | null, href: `/subscriptions/${s.id}` })),
    ...subs.filter((s) => s.canceledDate).map((s) => ({ date: iso(s.canceledDate), kind: 'subscriptionCanceled', ref: s.id, customerName: s.customer.displayName, status: null, href: `/subscriptions/${s.id}` })),
    ...invs.map((i) => ({ date: iso(i.issueDate), kind: 'invoice', ref: i.number, customerName: i.customer.displayName, status: i.status.toLowerCase(), href: `/customers/${i.customerId}` })),
    ...pays.map((p) => ({ date: iso(p.date), kind: 'payment', ref: p.invoice.number, customerName: p.customer.displayName, status: p.status.toLowerCase(), href: `/customers/${p.customerId}` })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, take);
}

/** Cheap counts for the notification bell and the action center. */
export async function alertCounts(prisma: PrismaClient, org: string, today: string) {
  const day = new Date(`${today}T00:00:00Z`);
  const in15 = new Date(day.getTime() + 15 * 86400000);
  const [overdue, failed, pastDue, renewals] = await Promise.all([
    prisma.invoice.count({ where: { organizationId: org, status: 'ISSUED', dueDate: { lt: day } } }),
    prisma.billingPayment.count({ where: { organizationId: org, status: 'FAILED' } }),
    prisma.subscription.count({ where: { organizationId: org, status: 'PAST_DUE' } }),
    prisma.subscription.count({ where: { organizationId: org, status: 'ACTIVE', nextRenewal: { gte: day, lte: in15 } } }),
  ]);
  return { overdueInvoices: overdue, failedPayments: failed, pastDueSubscriptions: pastDue, renewalsSoon: renewals, high: overdue + failed, total: overdue + failed + pastDue + renewals };
}
