import { badRequest, guard, json, parseCurrency, parseRanges, todayIso } from '@/lib/server/guard';
import { financeOverview } from '@/lib/server/finance';
import { addDays, diffDays } from '@/lib/period';

export const dynamic = 'force-dynamic';

type Severity = 'high' | 'medium' | 'low';

interface AlertItem {
  id: string;
  severity: Severity;
  type: 'overdueInvoice' | 'failedPayment' | 'pastDueSub' | 'renewalDue' | 'budgetNear' | 'budgetOver';
  date: string;
  label: string; // invoice number / subscription id / currency
  customerName: string | null;
  amount: number | null;
  currency: string | null;
  detail: string | null; // plan name or percentage
  href: string | null;
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '');

/**
 * Calculated alerts (not stored, never auto-resolved). Rules are documented on the Alerts page:
 * overdue invoice = high, failed payment = high, past-due subscription = medium,
 * renewal within 15 days = low, budget >= 80% = medium / over = high.
 */
export const GET = guard('alerts:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const today = todayIso(sp);
  const org = access.organizationId;
  const items: AlertItem[] = [];

  const [overdue, failed, pastDue, renewals] = await Promise.all([
    prisma.invoice.findMany({
      where: { organizationId: org, status: 'ISSUED', dueDate: { lt: new Date(`${today}T00:00:00Z`) } },
      include: { customer: { select: { displayName: true } } },
    }),
    prisma.billingPayment.findMany({
      where: { organizationId: org, status: 'FAILED' },
      include: { customer: { select: { displayName: true } }, invoice: { select: { number: true } } },
    }),
    prisma.subscription.findMany({
      where: { organizationId: org, status: 'PAST_DUE' },
      include: { customer: { select: { displayName: true } }, plan: { select: { name: true } } },
    }),
    prisma.subscription.findMany({
      where: { organizationId: org, status: 'ACTIVE', nextRenewal: { gte: new Date(`${today}T00:00:00Z`), lte: new Date(`${addDays(today, 15)}T00:00:00Z`) } },
      include: { customer: { select: { displayName: true } }, plan: { select: { name: true } } },
    }),
  ]);

  for (const i of overdue) {
    items.push({ id: `inv-${i.id}`, severity: 'high', type: 'overdueInvoice', date: iso(i.dueDate), label: i.number, customerName: i.customer.displayName, amount: Number(i.total.toString()), currency: i.currency, detail: null, href: `/customers/${i.customerId}` });
  }
  for (const p of failed) {
    items.push({ id: `pay-${p.id}`, severity: 'high', type: 'failedPayment', date: iso(p.date), label: p.invoice.number, customerName: p.customer.displayName, amount: Number(p.amount.toString()), currency: p.currency, detail: null, href: `/customers/${p.customerId}` });
  }
  for (const s of pastDue) {
    items.push({ id: `sub-${s.id}`, severity: 'medium', type: 'pastDueSub', date: iso(s.nextRenewal) || iso(s.startDate), label: s.id, customerName: s.customer.displayName, amount: null, currency: null, detail: s.plan.name, href: `/subscriptions/${s.id}` });
  }
  for (const s of renewals) {
    items.push({ id: `ren-${s.id}`, severity: 'low', type: 'renewalDue', date: iso(s.nextRenewal), label: s.id, customerName: s.customer.displayName, amount: null, currency: null, detail: `${s.plan.name} · ${diffDays(today, iso(s.nextRenewal))}d`, href: `/subscriptions/${s.id}` });
  }

  // Budget rule for the selected period / currency (optional parameters).
  const currency = parseCurrency(sp.get('currency'));
  if (sp.get('from') && currency) {
    const ranges = parseRanges(sp);
    if (!ranges) return badRequest('Invalid period');
    const { overview, meta } = await financeOverview(prisma, org, currency, ranges.range, ranges.prev);
    const spent = overview.totalExpenses.current;
    if (meta.budgetConfigured && meta.budgetCap > 0) {
      const pct = (spent / meta.budgetCap) * 100;
      if (pct >= 80) {
        items.push({ id: 'budget', severity: pct > 100 ? 'high' : 'medium', type: pct > 100 ? 'budgetOver' : 'budgetNear', date: ranges.range.from, label: currency, customerName: null, amount: spent, currency, detail: `${pct.toFixed(0)}%`, href: '/budgets' });
      }
    }
  }

  const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => order[a.severity] - order[b.severity] || b.date.localeCompare(a.date));

  // Recent activity (informational, not a security audit log).
  const [subs, invs, pays] = await Promise.all([
    prisma.subscription.findMany({ where: { organizationId: org, startDate: { lte: new Date(`${today}T00:00:00Z`) } }, select: { id: true, startDate: true, canceledDate: true, customer: { select: { displayName: true } } }, orderBy: { startDate: 'desc' }, take: 12 }),
    prisma.invoice.findMany({ where: { organizationId: org, status: { in: ['ISSUED', 'PAID'] }, issueDate: { lte: new Date(`${today}T00:00:00Z`) } }, select: { number: true, status: true, issueDate: true, customerId: true }, orderBy: { issueDate: 'desc' }, take: 12 }),
    prisma.billingPayment.findMany({ where: { organizationId: org, date: { lte: new Date(`${today}T00:00:00Z`) } }, select: { id: true, status: true, date: true, customerId: true, invoice: { select: { number: true } } }, orderBy: { date: 'desc' }, take: 12 }),
  ]);
  const activity = [
    ...subs.map((s) => ({ date: iso(s.startDate), kind: 'subscriptionCreated', ref: s.id, customerName: s.customer.displayName, status: null as string | null, href: `/subscriptions/${s.id}` })),
    ...subs.filter((s) => s.canceledDate).map((s) => ({ date: iso(s.canceledDate), kind: 'subscriptionCanceled', ref: s.id, customerName: s.customer.displayName, status: null, href: `/subscriptions/${s.id}` })),
    ...invs.map((i) => ({ date: iso(i.issueDate), kind: 'invoice', ref: i.number, customerName: null, status: i.status.toLowerCase(), href: `/customers/${i.customerId}` })),
    ...pays.map((p) => ({ date: iso(p.date), kind: 'payment', ref: p.invoice.number, customerName: null, status: p.status.toLowerCase(), href: `/customers/${p.customerId}` })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  return json({ asOf: today, alerts: items, activity });
});
