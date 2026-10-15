/**
 * Writes the deterministic SYNTHETIC demo dataset (2,000 customers + connected records) to the database.
 *
 *   npm run demo:scale            dry run: prints the plan, validates, writes NOTHING
 *   npm run demo:scale -- --confirm     additive, idempotent write (existing rows are never modified or deleted)
 *   npm run demo:scale -- --reset-demo --confirm   first removes ONLY rows whose id contains "-demo-",
 *                                       and only when ALLOW_DEMO_RESET=true is also set
 *
 * Safety: refuses to run when NODE_ENV=production unless ALLOW_PRODUCTION_SEED=true; never prints the database
 * URL or any credential; never truncates tables; never touches rows that are not part of this dataset.
 * Run the base seed first (npx prisma db seed): this script needs the tenant, platforms, accounts and catalog.
 */
import { PrismaClient } from '@prisma/client';
import { PLANS } from '../src/lib/subscriptionDemo';
import { generateScaleDataset, validateScaleDataset, TENANT_ORG_ID } from './demo/generate';

const args = new Set(process.argv.slice(2));
const confirm = args.has('--confirm');
const reset = args.has('--reset-demo');

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('Refusing to run: NODE_ENV=production and ALLOW_PRODUCTION_SEED is not "true".');
  process.exit(1);
}
if (reset && process.env.ALLOW_DEMO_RESET !== 'true') {
  console.error('Refusing --reset-demo: set ALLOW_DEMO_RESET=true as well (it deletes only "-demo-" rows).');
  process.exit(1);
}

const prisma = new PrismaClient();
const d = (iso: string) => new Date(`${iso}T00:00:00Z`);
const BATCH = 1000;

async function insertInBatches<T>(label: string, rows: T[], write: (chunk: T[]) => Promise<{ count: number }>) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const res = await write(rows.slice(i, i + BATCH));
    inserted += res.count;
  }
  console.log(`  ${label}: ${rows.length} generated, ${inserted} newly inserted, ${rows.length - inserted} already present`);
}

async function main() {
  const catalog = { plans: PLANS };
  const ds = generateScaleDataset(catalog);
  const report = validateScaleDataset(ds, catalog);
  console.log('Dataset (in memory):', JSON.stringify(report.counts));
  console.log('Segments:', JSON.stringify(report.segments));
  if (!report.ok) {
    console.error('Validation failed, nothing written:\n' + report.errors.join('\n'));
    process.exit(1);
  }

  if (!confirm) {
    console.log('\nDRY RUN: nothing was written. Re-run with --confirm to write this dataset (additive and idempotent).');
    return;
  }

  // Preconditions: the base seed must already exist (tenant, platforms, accounts, catalog).
  const [tenant, plans, platforms, accounts] = await Promise.all([
    prisma.organization.findUnique({ where: { id: TENANT_ORG_ID }, select: { id: true } }),
    prisma.plan.findMany({ where: { organizationId: TENANT_ORG_ID, id: { in: PLANS.map((p) => p.id) } }, select: { id: true } }),
    prisma.platform.findMany({ where: { organizationId: TENANT_ORG_ID }, select: { id: true } }),
    prisma.financialAccount.findMany({ where: { organizationId: TENANT_ORG_ID }, select: { id: true } }),
  ]);
  const need = new Set(ds.transactions.map((t) => t.platformId));
  const needAcc = new Set(ds.transactions.map((t) => t.accountId));
  const missing: string[] = [];
  if (!tenant) missing.push('tenant organization');
  if (plans.length !== PLANS.length) missing.push(`catalog plans (${plans.length}/${PLANS.length})`);
  for (const p of need) if (!platforms.some((x) => x.id === p)) missing.push(`platform ${p}`);
  for (const a of needAcc) if (!accounts.some((x) => x.id === a)) missing.push(`account ${a}`);
  if (missing.length) {
    console.error('Base seed data is missing: ' + missing.join(', ') + '. Run "npx prisma db seed" first.');
    process.exit(1);
  }

  if (reset) {
    console.log('Removing previously generated "-demo-" rows (FK order)...');
    await prisma.financialTransaction.deleteMany({ where: { organizationId: TENANT_ORG_ID, id: { startsWith: 'txn-demo-' } } });
    await prisma.billingPayment.deleteMany({ where: { organizationId: TENANT_ORG_ID, id: { startsWith: 'pay-demo-' } } });
    await prisma.invoice.deleteMany({ where: { organizationId: TENANT_ORG_ID, id: { startsWith: 'inv-demo-' } } });
    await prisma.subscription.deleteMany({ where: { organizationId: TENANT_ORG_ID, id: { startsWith: 'sub-demo-' } } });
    await prisma.customer.deleteMany({ where: { organizationId: TENANT_ORG_ID, id: { startsWith: 'cust-demo-' } } });
    await prisma.organization.deleteMany({ where: { id: { startsWith: 'org-demo-' } } });
  }

  console.log('Writing (additive, idempotent)...');
  await insertInBatches('organizations', ds.organizations, (c) =>
    prisma.organization.createMany({
      data: c.map((o) => ({ id: o.id, name: o.name, kind: o.kind, industry: o.industry, city: o.city, country: o.country, email: o.email, status: o.status, createdAt: d(o.createdAt) })),
      skipDuplicates: true,
    })
  );
  await insertInBatches('customers', ds.customers, (c) =>
    prisma.customer.createMany({
      data: c.map((x) => ({
        id: x.id, organizationId: x.organizationId, type: x.type, displayName: x.displayName, businessName: x.businessName, linkedOrganizationId: x.linkedOrganizationId,
        email: x.email, phone: x.phone, city: x.city, country: x.country, status: x.status, notes: x.notes, createdAt: d(x.createdAt),
      })),
      skipDuplicates: true,
    })
  );
  await insertInBatches('subscriptions', ds.subscriptions, (c) =>
    prisma.subscription.createMany({
      data: c.map((s) => ({
        id: s.id, organizationId: s.organizationId, customerId: s.customerId, planId: s.planId, status: s.status, startDate: d(s.startDate),
        nextRenewal: s.nextRenewal ? d(s.nextRenewal) : null, canceledDate: s.canceledDate ? d(s.canceledDate) : null, price: s.price, currency: s.currency, interval: s.interval,
      })),
      skipDuplicates: true,
    })
  );
  await insertInBatches('invoices', ds.invoices, (c) =>
    prisma.invoice.createMany({
      data: c.map((i) => ({
        id: i.id, organizationId: i.organizationId, number: i.number, customerId: i.customerId, subscriptionId: i.subscriptionId, currency: i.currency, total: i.total,
        issueDate: d(i.issueDate), dueDate: d(i.dueDate), paidDate: i.paidDate ? d(i.paidDate) : null, status: i.status, note: i.note,
      })),
      skipDuplicates: true,
    })
  );
  await insertInBatches('payments (simulated)', ds.payments, (c) =>
    prisma.billingPayment.createMany({
      data: c.map((p) => ({
        id: p.id, organizationId: p.organizationId, invoiceId: p.invoiceId, customerId: p.customerId, date: d(p.date), amount: p.amount, currency: p.currency, method: p.method, status: p.status,
      })),
      skipDuplicates: true,
    })
  );
  await insertInBatches('financial transactions', ds.transactions, (c) =>
    prisma.financialTransaction.createMany({
      data: c.map((t) => ({
        id: t.id, organizationId: t.organizationId, description: t.description, descriptionAr: t.descriptionAr, amount: t.amount, currency: t.currency, type: t.type, status: t.status,
        category: t.category, categoryAr: t.categoryAr, transactionDate: d(t.transactionDate), dueDate: t.dueDate ? d(t.dueDate) : null, reference: t.reference,
        platformId: t.platformId, paymentMethod: t.paymentMethod, accountId: t.accountId,
      })),
      skipDuplicates: true,
    })
  );

  // Company-wide monthly budgets for the generated months (demo-owned figures; created or updated by key).
  for (const b of ds.budgets) {
    const existing = await prisma.monthlyBudget.findFirst({ where: { organizationId: b.organizationId, month: d(b.month), currency: b.currency, platformId: null } });
    if (existing) await prisma.monthlyBudget.update({ where: { id: existing.id }, data: { amount: b.amount } });
    else await prisma.monthlyBudget.create({ data: { organizationId: b.organizationId, month: d(b.month), currency: b.currency, amount: b.amount, platformId: null } });
  }
  console.log(`  budgets: ${ds.budgets.length} created or updated`);

  // Post-write verification against the database itself.
  const [c, s, i, p, t] = await Promise.all([
    prisma.customer.count({ where: { id: { startsWith: 'cust-demo-' } } }),
    prisma.subscription.count({ where: { id: { startsWith: 'sub-demo-' } } }),
    prisma.invoice.count({ where: { id: { startsWith: 'inv-demo-' } } }),
    prisma.billingPayment.count({ where: { id: { startsWith: 'pay-demo-' } } }),
    prisma.financialTransaction.count({ where: { id: { startsWith: 'txn-demo-' } } }),
  ]);
  const orphans = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT (
      (SELECT COUNT(*) FROM "Subscription" s WHERE s.id LIKE 'sub-demo-%' AND NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = s."customerId")) +
      (SELECT COUNT(*) FROM "Invoice" i WHERE i.id LIKE 'inv-demo-%' AND NOT EXISTS (SELECT 1 FROM "Subscription" s WHERE s.id = i."subscriptionId")) +
      (SELECT COUNT(*) FROM "BillingPayment" p WHERE p.id LIKE 'pay-demo-%' AND NOT EXISTS (SELECT 1 FROM "Invoice" i WHERE i.id = p."invoiceId"))
    ) AS n`;
  console.log(`Database now holds: customers ${c}, subscriptions ${s}, invoices ${i}, payments ${p}, transactions ${t}; orphan rows: ${Number(orphans[0].n)}`);
}

main()
  .catch((e) => {
    // Never print the error message verbatim: driver errors can echo connection details.
    console.error('Demo scale seed failed:', e instanceof Error ? e.name : 'Error', (e as { code?: string })?.code ?? '');
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
