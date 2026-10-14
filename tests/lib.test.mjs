// Run with: npm test   (Node's built-in runner; no extra dependencies)
// Covers pure logic only. Database-backed checks live in test-financial-calculations.js.
import test from 'node:test';
import assert from 'node:assert/strict';

import { getMonthRangeUtc, getPreviousMonth, isValidMonth } from '../src/lib/month.ts';
import { csvText, transactionsToCsv } from '../src/lib/csv.ts';
import { mapApiTransaction } from '../src/lib/mapApi.ts';
import { keepBrandNames } from '../src/lib/brand.ts';
import { compareBy, pctChange } from '../src/lib/analytics.ts';
import {
  DEMO_TODAY,
  INVOICES,
  PAYMENTS,
  agingBuckets,
  invoicedAndCollected,
  monthlyNormalized,
  mrrByCurrency,
} from '../src/lib/subscriptionDemo.ts';

test('isValidMonth accepts YYYY-MM only', () => {
  for (const ok of ['2026-10', '2026-01', '1999-12']) assert.equal(isValidMonth(ok), true, ok);
  for (const bad of ['2026-13', '2026-00', '2026-1', 'abc', '', null, undefined, '2026-10-01']) {
    assert.equal(isValidMonth(bad), false, String(bad));
  }
});

test('getPreviousMonth wraps over the year boundary', () => {
  assert.equal(getPreviousMonth('2026-10'), '2026-09');
  assert.equal(getPreviousMonth('2026-01'), '2025-12');
});

test('getMonthRangeUtc is timezone independent and covers whole calendar days', () => {
  const oct = getMonthRangeUtc('2026-10');
  assert.equal(oct.start.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(oct.end.toISOString(), '2026-10-31T00:00:00.000Z');
  // leap year February
  assert.equal(getMonthRangeUtc('2028-02').end.toISOString(), '2028-02-29T00:00:00.000Z');
});

test('csvText quotes fields and neutralises spreadsheet formulas', () => {
  assert.equal(csvText('plain'), '"plain"');
  assert.equal(csvText('say "hi"'), '"say ""hi"""');
  assert.equal(csvText('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  for (const lead of ['+', '-', '@']) assert.ok(csvText(`${lead}1`).startsWith(`"'${lead}`));
  assert.equal(csvText(null), '""');
});

const apiTx = {
  id: 'tx1',
  description: 'Bookings',
  descriptionAr: null,
  amount: 148500,
  currency: 'LYD',
  type: 'INCOME',
  status: 'PAID',
  category: 'Customer Collection',
  categoryAr: null,
  transactionDate: '2026-10-08T00:00:00.000Z',
  paymentMethod: 'BANK_TRANSFER',
  paymentProvider: null,
  externalReference: null,
  platform: { id: 'p1', name: 'A-Stay Bookings', code: 'A-STAY' },
  account: null,
  accountId: null,
};

test('mapApiTransaction converts the API shape into the UI shape', () => {
  const t = mapApiTransaction(apiTx);
  assert.equal(t.type, 'inflow');
  assert.equal(t.status, 'paid');
  assert.equal(t.date, '2026-10-08');
  assert.equal(t.month, '2026-10');
  assert.equal(t.source, 'A-Stay');
  assert.equal(t.descriptionAr, 'Bookings'); // falls back to English when Arabic is missing
  assert.equal(typeof t.amount, 'number');

  const out = mapApiTransaction({ ...apiTx, type: 'EXPENSE', status: 'UPCOMING', platform: null, paymentMethod: 'WEIRD' });
  assert.equal(out.type, 'outflow');
  assert.equal(out.status, 'upcoming');
  assert.equal(out.source, 'Corporate');
  assert.equal(out.paymentMethod, 'OTHER');
});

test('transactionsToCsv leaves amounts numeric and marks the data set as demo', () => {
  const csv = transactionsToCsv([mapApiTransaction(apiTx)]);
  const [header, row] = csv.split('\r\n');
  assert.ok(header.includes('"DataSet"'));
  assert.ok(row.includes(',148500,'));
  assert.ok(row.endsWith('"DEMO — fictional data"'));
});

test('monthlyNormalized converts billing intervals to a monthly value', () => {
  assert.equal(monthlyNormalized(100, 'monthly'), 100);
  assert.equal(monthlyNormalized(300, 'quarterly'), 100);
  assert.equal(monthlyNormalized(1200, 'yearly'), 100);
});

test('MRR counts active subscriptions only and never mixes currencies', () => {
  const mrr = mrrByCurrency();
  assert.ok(Math.abs(mrr.LYD - 5726.67) < 0.01);
  assert.ok(Math.abs(mrr.USD - 251.17) < 0.01);
});

test('collections count only succeeded payments (failed / pending are excluded)', () => {
  const lydSucceeded = PAYMENTS.filter((p) => p.currency === 'LYD' && p.status === 'succeeded').reduce((s, p) => s + p.amount, 0);
  assert.equal(invoicedAndCollected().LYD.collected, lydSucceeded);
  assert.ok(PAYMENTS.some((p) => p.status === 'failed'));
  assert.ok(PAYMENTS.some((p) => p.status === 'pending'));
});

test('overdue status and aging follow the due date relative to DEMO_TODAY', () => {
  for (const inv of INVOICES) {
    if (inv.status === 'overdue') assert.ok(inv.dueDate < DEMO_TODAY, inv.number);
    if (inv.status === 'issued') assert.ok(inv.dueDate >= DEMO_TODAY, inv.number);
  }
  const aging = agingBuckets();
  const agedTotal = Object.values(aging).reduce((s, b) => s + b.LYD, 0);
  const outstandingLyd = INVOICES.filter((i) => (i.status === 'issued' || i.status === 'overdue') && i.currency === 'LYD').reduce((s, i) => s + i.total, 0);
  assert.equal(agedTotal, outstandingLyd); // every outstanding invoice lands in exactly one bucket
});

test('keepBrandNames keeps brand names in Latin script inside Arabic text', () => {
  assert.equal(keepBrandNames('حجوزات أي-ستاي'), 'حجوزات A-Stay');
  assert.equal(keepBrandNames('اشتراكات أي-ماركت وأي-سبيس'), 'اشتراكات A-Market وA-Space');
  assert.equal(keepBrandNames('وحدات أعمال أ-جروب'), 'وحدات أعمال A-Group');
  assert.equal(keepBrandNames('already A-Stay'), 'already A-Stay');
});

test('pctChange never invents a percentage when the base month is empty', () => {
  assert.equal(pctChange(100, 0), null);
  assert.equal(pctChange(150, 100), 50);
  assert.equal(pctChange(50, 100), -50);
});

test('compareBy groups two months per key, one currency, using the dashboard recognition rules', () => {
  const tx = (o) => ({ id: Math.random().toString(), currency: 'LYD', type: 'outflow', status: 'paid', source: 'A-Stay', category: 'Ads', categoryAr: 'x', amount: 10, month: '2026-10', ...o });
  const rows = [
    tx({ amount: 100 }),
    tx({ amount: 40, month: '2026-09' }),
    tx({ amount: 999, status: 'upcoming' }), // not paid -> ignored for expenses
    tx({ amount: 999, currency: 'USD' }), // other currency -> ignored
    tx({ amount: 5, category: 'Rent' }),
  ];
  const out = compareBy(rows, { kind: 'expense', currency: 'LYD', month: '2026-10', previousMonth: '2026-09', language: 'en', groupKey: (x) => x.category, label: (x) => x.category });
  assert.deepEqual(out.map((o) => [o.key, o.current, o.previous]), [['Ads', 100, 40], ['Rent', 5, 0]]);
});