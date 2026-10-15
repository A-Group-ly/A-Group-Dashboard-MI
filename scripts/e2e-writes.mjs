// End-to-end check of the write APIs against a running dev server (DEV_AUTH_BYPASS_ROLE=ADMIN, port 3200).
// Creates clearly named TEST rows, exercises every write route, then removes everything it created.
//   node --env-file=.env scripts/e2e-writes.mjs
import { PrismaClient } from '@prisma/client';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3200';
const prisma = new PrismaClient();
const created = { customers: [], subs: [], invoices: [], txs: [], plans: [], products: [] };
let failures = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  let json = null;
  try { json = await res.json(); } catch { /* csv or empty */ }
  return { status: res.status, json };
}
function expect(label, got, want) {
  const ok = Array.isArray(want) ? want.includes(got) : got === want;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  (got ${got}${ok ? '' : `, wanted ${want}`})`);
}

try {
  const stamp = Date.now().toString(36);
  // customers
  let r = await call('POST', '/api/customers', { type: 'INDIVIDUAL', displayName: '', email: 'bad' });
  expect('customer create: validation errors', r.status, 422);
  r = await call('POST', '/api/customers', { type: 'SMALL_BUSINESS', displayName: `ZZ TEST ${stamp}`, email: `zz.${stamp}@example.com`, city: 'Tripoli', notes: 'e2e test' });
  expect('customer create', r.status, 201);
  const cust = r.json.id; created.customers.push(cust);
  r = await call('POST', '/api/customers', { type: 'INDIVIDUAL', displayName: 'ZZ dup', email: `ZZ.${stamp}@example.com` });
  expect('customer create: duplicate email blocked', r.status, 409);
  r = await call('PATCH', `/api/customers/${cust}`, { displayName: `ZZ TEST ${stamp} edited`, phone: '+218 91 000 0000' });
  expect('customer edit', r.status, 200);

  // subscriptions
  const cat = await call('GET', '/api/catalog');
  const plan = cat.json.data.flatMap((p) => p.plans).find((p) => p.currency === 'LYD' && p.status === 'active' && p.trialDays === 0);
  r = await call('POST', '/api/subscriptions', { customerId: cust, planId: plan.id, units: 2, startDate: '2026-10-01' });
  expect('subscription create', r.status, 201);
  const sub = r.json.id; created.subs.push(sub);
  expect('subscription price = plan x units', r.json.price, plan.price * 2);
  r = await call('PATCH', `/api/subscriptions/${sub}`, { action: 'resume' });
  expect('subscription resume on active is refused', r.status, 409);
  r = await call('PATCH', `/api/subscriptions/${sub}`, { action: 'pause' });
  expect('subscription pause', r.status, 200);
  r = await call('PATCH', `/api/subscriptions/${sub}`, { action: 'resume' });
  expect('subscription resume', r.status, 200);

  // invoices + payments
  r = await call('POST', '/api/invoices', { subscriptionId: sub, issueDate: '2026-10-05' });
  expect('invoice create from subscription', r.status, 201);
  const inv = r.json; created.invoices.push(inv.id);
  expect('invoice total = subscription price', inv.total, plan.price * 2);
  r = await call('POST', '/api/invoices', { subscriptionId: sub, issueDate: '2026-10-05' });
  expect('duplicate invoice for same date blocked', r.status, 409);
  r = await call('POST', '/api/invoices', { customerId: cust, currency: 'USD', amount: '12.5', issueDate: '2026-10-06' });
  expect('one-off invoice create', r.status, 201);
  const inv2 = r.json; created.invoices.push(inv2.id);
  r = await call('POST', `/api/invoices/${inv.id}/payments`, { method: 'bank_transfer', date: '2026-10-07' });
  expect('record payment', r.status, 201);
  r = await call('POST', `/api/invoices/${inv.id}/payments`, { method: 'cash' });
  expect('double payment blocked', r.status, 409);
  r = await call('PATCH', `/api/invoices/${inv.id}`, { action: 'void' });
  expect('void a paid invoice blocked', r.status, 409);
  r = await call('PATCH', `/api/invoices/${inv2.id}`, { action: 'void' });
  expect('void an open invoice', r.status, 200);
  const booked = await prisma.financialTransaction.findFirst({ where: { reference: inv.number } });
  expect('payment booked an income transaction', booked?.type, 'INCOME');
  expect('...in the same currency and amount', booked && Number(booked.amount.toString()) === inv.total && booked.currency === inv.currency, true);
  if (booked) created.txs.push(booked.id);

  r = await call('PATCH', `/api/subscriptions/${sub}`, { action: 'cancel', date: '2026-10-10' });
  expect('subscription cancel', r.status, 200);
  r = await call('POST', '/api/invoices', { subscriptionId: sub, issueDate: '2026-10-12' });
  expect('invoice for a canceled subscription blocked', r.status, 409);

  // transactions
  r = await call('POST', '/api/transactions', { type: 'EXPENSE', status: 'PAID', description: `ZZ expense ${stamp}`, amount: '99.99', currency: 'USD', category: 'ZZ Test', transactionDate: '2026-10-08', accountId: 'acc-lyd-bank-main' });
  expect('transaction: account currency mismatch blocked', r.status, 422);
  r = await call('POST', '/api/transactions', { type: 'EXPENSE', status: 'PAID', description: `ZZ expense ${stamp}`, amount: '99.99', currency: 'USD', category: 'ZZ Test', transactionDate: '2026-10-08', accountId: 'acc-usd-bank-main', platformId: 'plat-corporate' });
  expect('transaction create', r.status, 201);
  const tx = r.json.id; created.txs.push(tx);
  r = await call('PATCH', `/api/transactions/${tx}`, { amount: '120.5', status: 'PENDING' });
  expect('transaction edit', r.status, 200);
  r = await call('PATCH', `/api/transactions/${booked.id}`, { amount: '1' });
  expect('billing-managed transaction cannot be edited', r.status, 409);
  r = await call('DELETE', `/api/transactions/${booked.id}`);
  expect('billing-managed transaction cannot be deleted', r.status, 409);
  r = await call('DELETE', `/api/transactions/${tx}`);
  expect('transaction delete', r.status, 200);

  // budgets + catalog
  r = await call('PUT', '/api/budgets', { month: '2026-07', currency: 'USD', amount: '1000' });
  expect('budget upsert', r.status, 200);
  r = await call('PUT', '/api/budgets', { month: '2026-13', currency: 'USD', amount: '1000' });
  expect('budget: bad month rejected', r.status, 422);
  r = await call('POST', '/api/catalog', { productName: `ZZ Product ${stamp}`, name: 'ZZ Plan', interval: 'MONTHLY', price: '10', currency: 'USD' });
  expect('plan + new product create', r.status, 201);
  created.plans.push(r.json.id);

  // QoL endpoints
  r = await call('GET', '/api/invoices?status=overdue&pageSize=1');
  const overdue = r.json.data[0];
  r = await call('POST', `/api/invoices/${overdue.id}/remind`);
  expect('payment reminder recorded for an overdue invoice', r.status, 200);
  r = await call('POST', `/api/invoices/${overdue.id}/remind`);
  expect('second reminder within 24h blocked', r.status, 409);
  r = await call('POST', `/api/invoices/${inv.id}/remind`);
  expect('reminder on a paid invoice blocked', r.status, 409);
  r = await call('GET', '/api/alerts/count');
  expect('alert counts', r.status === 200 && r.json.total >= r.json.high, true);
  r = await call('GET', '/api/search?q=tourism');
  expect('global search returns customers', r.json.customers.length > 0, true);
  r = await call('GET', '/api/search?q=a');
  expect('global search ignores 1-character queries', r.json.customers.length, 0);

  // bulk invoice actions + printable invoice data
  const bulkIds = [];
  const bulkNumbers = [];
  for (let k = 0; k < 3; k++) {
    r = await call('POST', '/api/invoices', { customerId: cust, currency: 'LYD', amount: String(100 + k), issueDate: '2026-10-0' + (k + 1) });
    expect(`bulk setup invoice ${k + 1}`, r.status, 201);
    created.invoices.push(r.json.id);
    bulkIds.push(r.json.id);
    bulkNumbers.push(r.json.number);
  }
  r = await call('POST', '/api/invoices/bulk', { action: 'pay', method: 'cash', ids: bulkIds.slice(0, 2) });
  expect('bulk pay: both succeed', r.json?.succeeded, 2);
  r = await call('POST', '/api/invoices/bulk', { action: 'pay', method: 'cash', ids: bulkIds.slice(0, 2) });
  expect('bulk pay again: both refused (no double payment)', r.json?.failed, 2);
  r = await call('POST', '/api/invoices/bulk', { action: 'void', ids: [bulkIds[2], bulkIds[0]] });
  expect('bulk void: open one voided, paid one refused', [r.json?.succeeded, r.json?.failed].join('/'), '1/1');
  r = await call('POST', '/api/invoices/bulk', { action: 'pay', method: 'cash', ids: Array.from({ length: 11 }, (_, i) => 'x' + i) });
  expect('bulk: more than 10 ids rejected', r.status, 422);
  r = await call('POST', '/api/invoices/bulk', { action: 'explode', ids: ['a'] });
  expect('bulk: unknown action rejected', r.status, 422);
  const paidTx = await prisma.financialTransaction.count({ where: { reference: { in: bulkNumbers.slice(0, 2) }, type: 'INCOME' } });
  expect('bulk pay booked one income transaction per invoice', paidTx, 2);
  r = await call('GET', `/api/invoices/${bulkIds[0]}`);
  expect('invoice document data', r.status === 200 && r.json.invoice.status === 'paid' && r.json.payments.length === 1 && r.json.customer.id === cust, true);
  r = await call('GET', '/api/invoices/does-not-exist');
  expect('unknown invoice is 404', r.status, 404);

  // reads
  r = await call('GET', '/api/audit?pageSize=5');
  expect('audit log readable', r.status, 200);
  expect('audit log recorded the changes', r.json.total >= 15, true);
  r = await call('GET', `/api/customers?q=ZZ%20TEST%20${stamp}`);
  expect('customer search finds the new customer', r.json.total, 1);
  for (const [name, path] of [['customers', '/api/customers?format=csv&pageSize=5'], ['subscriptions', '/api/subscriptions?format=csv'], ['invoices', '/api/invoices?format=csv'], ['transactions', '/api/transactions?format=csv&from=2026-10-01&to=2026-10-31']]) {
    const res = await fetch(BASE + path);
    const text = await res.text();
    expect(`csv export ${name}`, res.status === 200 && text.includes('DEMO'), true);
  }
} finally {
  // Remove everything this script created (children first). The audit rows of this run are removed too.
  const subs = created.subs;
  await prisma.billingPayment.deleteMany({ where: { invoice: { OR: [{ id: { in: created.invoices } }] } } });
  await prisma.financialTransaction.deleteMany({ where: { OR: [{ id: { in: created.txs } }, { category: 'ZZ Test' }, { reference: { in: (await prisma.invoice.findMany({ where: { id: { in: created.invoices } }, select: { number: true } })).map((i) => i.number) } }] } });
  await prisma.invoice.deleteMany({ where: { id: { in: created.invoices } } });
  await prisma.subscription.deleteMany({ where: { id: { in: subs } } });
  await prisma.customer.deleteMany({ where: { id: { in: created.customers } } });
  await prisma.plan.deleteMany({ where: { id: { in: created.plans } } });
  await prisma.product.deleteMany({ where: { name: { startsWith: 'ZZ Product' } } });
  await prisma.monthlyBudget.deleteMany({ where: { organizationId: 'org-a-group-holding', platformId: null, month: new Date('2026-07-01T00:00:00Z'), currency: 'USD' } });
  await prisma.auditLog.deleteMany({ where: { actorUserId: 'dev-user' } });
  await prisma.$disconnect();
}
console.log(failures === 0 ? '\nALL WRITE CHECKS PASSED (test rows removed)' : `\n${failures} CHECK(S) FAILED (test rows removed)`);
process.exit(failures === 0 ? 0 : 1);
