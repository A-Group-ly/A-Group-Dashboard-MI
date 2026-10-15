// Read-only: compares the SQL aggregates with the pure reference functions in src/lib/billing.ts on the
// data currently in the database. Run: node --env-file=.env scripts/check-billing-sql.mjs
import { PrismaClient } from '@prisma/client';
import { financialPositions, billingAnalytics } from '../src/lib/server/billingSql.ts';
import { financialPosition, agingBuckets, invoicedCollected, mrrByCurrency } from '../src/lib/billing.ts';

const prisma = new PrismaClient();
const ORG = 'org-a-group-holding';
const num = (v) => Number(v.toString());
const iso = (d) => (d ? d.toISOString().slice(0, 10) : null);
const today = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const range = { from: today.slice(0, 8) + '01', to: today.slice(0, 8) + '31' };
const prev = { from: '2000-01-01', to: '2000-01-31' };

const [invoices, payments, subs] = await Promise.all([
  prisma.invoice.findMany({ where: { organizationId: ORG } }),
  prisma.billingPayment.findMany({ where: { organizationId: ORG } }),
  prisma.subscription.findMany({ where: { organizationId: ORG } }),
]);
const inv = invoices.map((i) => ({ total: num(i.total), currency: i.currency, issueDate: iso(i.issueDate), dueDate: iso(i.dueDate), status: i.status }));
const pay = payments.map((p) => ({ amount: num(p.amount), currency: p.currency, date: iso(p.date), status: p.status }));
const sub = subs.map((s) => ({ status: s.status, price: num(s.price), currency: s.currency, interval: s.interval }));

let bad = 0;
const eq = (label, a, b) => {
  const ok = Math.abs(a - b) < 0.005;
  if (!ok) { bad++; console.log('MISMATCH', label, a, b); }
};

const sql = await financialPositions(prisma, ORG, range, prev, today);
for (const cur of ['LYD', 'USD']) {
  const ref = financialPosition({ currency: cur, invoices: inv, payments: pay, range, previousRange: prev, today });
  for (const k of Object.keys(ref)) if (typeof ref[k] === 'number') eq(`position.${cur}.${k}`, sql[cur][k], ref[k]);
}
const an = await billingAnalytics(prisma, ORG, today);
const mrr = mrrByCurrency(sub);
const money = invoicedCollected(inv, pay);
const aging = agingBuckets(inv, today);
for (const cur of ['LYD', 'USD']) {
  eq(`mrr.${cur}`, an.mrr[cur], mrr[cur]);
  for (const k of ['invoiced', 'collected', 'outstanding']) eq(`money.${cur}.${k}`, an.money[cur][k], money[cur][k]);
  for (const b of Object.keys(aging)) eq(`aging.${b}.${cur}`, an.aging[b][cur], aging[b][cur]);
}
eq('totalSubscriptions', an.totalSubscriptions, sub.length);
console.log(bad === 0 ? `SQL aggregates match the reference on ${inv.length} invoices, ${pay.length} payments, ${sub.length} subscriptions` : `${bad} mismatches`);
await prisma.$disconnect();
process.exit(bad === 0 ? 0 : 1);
