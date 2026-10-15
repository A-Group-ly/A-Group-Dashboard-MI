// Synthetic 2,000-customer dataset: pure, offline, no database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANS } from '../src/lib/subscriptionDemo.ts';
import { generateScaleDataset, validateScaleDataset, SEGMENT_COUNTS } from '../prisma/demo/generate.ts';

const catalog = { plans: PLANS };
const ds = generateScaleDataset(catalog);

test('exactly 2,000 customers with the required segment split', () => {
  assert.equal(ds.customers.length, 2000);
  for (const [type, n] of Object.entries(SEGMENT_COUNTS)) assert.equal(ds.customers.filter((c) => c.type === type).length, n, type);
});

test('the whole dataset passes validation (keys, foreign keys, reconciliation, ranges)', () => {
  const report = validateScaleDataset(ds, catalog);
  assert.deepEqual(report.errors, []);
  assert.equal(report.ok, true);
});

test('generation is deterministic and the seed matters', () => {
  assert.equal(JSON.stringify(generateScaleDataset(catalog)), JSON.stringify(ds));
  assert.notEqual(JSON.stringify(generateScaleDataset(catalog, { seed: 1 }).customers), JSON.stringify(ds.customers));
});

test('only fictional contact data: reserved email domain, non-assignable phone block, public sector labelled', () => {
  for (const c of ds.customers) {
    assert.ok(c.email.endsWith('@example.com'), c.id);
    assert.match(c.phone, /^\+218 9[1-4] 000 \d{4}$/);
    assert.ok(c.notes.startsWith('Synthetic demo record'), c.id);
  }
  for (const c of ds.customers.filter((x) => x.type === 'PUBLIC_SECTOR')) assert.ok(c.displayName.includes('(Fictional)'));
});

test('cities come from the required list and Arabic is kept alongside', () => {
  const allowed = new Set(['Tripoli', 'Benghazi', 'Misrata', 'Sabha', 'Zawiya', 'Bayda', 'Derna']);
  for (const c of ds.customers) assert.ok(allowed.has(c.city), c.city);
  assert.ok(ds.customers.every((c) => /[\u0600-\u06FF]/.test(c.notes)));
});

test('currencies stay separate: every record carries its own, matching its parents', () => {
  const sub = new Map(ds.subscriptions.map((s) => [s.id, s]));
  const inv = new Map(ds.invoices.map((i) => [i.id, i]));
  for (const i of ds.invoices) assert.equal(i.currency, sub.get(i.subscriptionId).currency);
  for (const p of ds.payments) assert.equal(p.currency, inv.get(p.invoiceId).currency);
  assert.ok(ds.transactions.every((t) => (t.currency === 'LYD') === t.accountId.includes('lyd')));
});

test('paid invoices have exactly one successful simulated payment for the full total', () => {
  const ok = new Map();
  for (const p of ds.payments) if (p.status === 'SUCCEEDED') ok.set(p.invoiceId, (ok.get(p.invoiceId) ?? 0) + 1);
  for (const i of ds.invoices) assert.equal(ok.get(i.id) ?? 0, i.status === 'PAID' ? 1 : 0, i.id);
});
