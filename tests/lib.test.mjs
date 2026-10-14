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
  agingBuckets,
  derivedInvoiceStatus,
  financialPosition,
  invoicedCollected,
  monthlyNormalized,
  mrrByCurrency,
} from '../src/lib/billing.ts';
import {
  bucketFor,
  bucketIndex,
  bucketStarts,
  monthsTouched,
  overlapWithMonth,
  previousRange,
  resolveRange,
  shiftPeriod,
} from '../src/lib/period.ts';
import { can, permissionForPath, ROLE_PERMISSIONS } from '../src/lib/permissions.ts';
import { devBypassRole } from '../src/lib/devBypass.ts';

/* ---------------- months ---------------- */

test('isValidMonth accepts YYYY-MM only', () => {
  for (const ok of ['2026-10', '2026-01', '1999-12']) assert.equal(isValidMonth(ok), true, ok);
  for (const bad of ['2026-13', '2026-00', '2026-1', 'abc', '', null, undefined, '2026-10-01']) assert.equal(isValidMonth(bad), false, String(bad));
});

test('getPreviousMonth wraps over the year boundary', () => {
  assert.equal(getPreviousMonth('2026-10'), '2026-09');
  assert.equal(getPreviousMonth('2026-01'), '2025-12');
});

test('getMonthRangeUtc is timezone independent', () => {
  assert.equal(getMonthRangeUtc('2026-10').start.toISOString(), '2026-10-01T00:00:00.000Z');
  assert.equal(getMonthRangeUtc('2026-10').end.toISOString(), '2026-10-31T00:00:00.000Z');
  assert.equal(getMonthRangeUtc('2028-02').end.toISOString(), '2028-02-29T00:00:00.000Z');
});

/* ---------------- periods ---------------- */

test('periods resolve to the right ranges', () => {
  const at = (granularity, anchor, extra = {}) => resolveRange({ granularity, anchor, ...extra });
  assert.deepEqual(at('day', '2026-10-08'), { from: '2026-10-08', to: '2026-10-08' });
  assert.deepEqual(at('week', '2026-10-08'), { from: '2026-10-05', to: '2026-10-11' }); // Monday..Sunday
  assert.deepEqual(at('week', '2026-10-11'), { from: '2026-10-05', to: '2026-10-11' });
  assert.deepEqual(at('month', '2026-02-10'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(at('quarter', '2026-11-20'), { from: '2026-10-01', to: '2026-12-31' });
  assert.deepEqual(at('half', '2026-03-01'), { from: '2026-01-01', to: '2026-06-30' });
  assert.deepEqual(at('half', '2026-09-01'), { from: '2026-07-01', to: '2026-12-31' });
  assert.deepEqual(at('custom', '2026-09-10', { customFrom: '2026-10-09', customTo: '2026-09-10' }), { from: '2026-09-10', to: '2026-10-09' }); // swapped input
});

test('each period has the equivalent previous period', () => {
  const prev = (granularity, anchor, extra = {}) => previousRange({ granularity, anchor, ...extra });
  assert.deepEqual(prev('day', '2026-10-01'), { from: '2026-09-30', to: '2026-09-30' });
  assert.deepEqual(prev('week', '2026-10-08'), { from: '2026-09-28', to: '2026-10-04' });
  assert.deepEqual(prev('month', '2026-01-15'), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(prev('month', '2026-03-15'), { from: '2026-02-01', to: '2026-02-28' });
  assert.deepEqual(prev('quarter', '2026-01-02'), { from: '2025-10-01', to: '2025-12-31' });
  assert.deepEqual(prev('half', '2026-07-01'), { from: '2026-01-01', to: '2026-06-30' });
  assert.deepEqual(prev('half', '2026-02-01'), { from: '2025-07-01', to: '2025-12-31' });
  // custom: same number of days immediately before
  assert.deepEqual(prev('custom', '2026-09-10', { customFrom: '2026-09-10', customTo: '2026-10-09' }), { from: '2026-08-11', to: '2026-09-09' });
});

test('shiftPeriod moves between neighbouring periods', () => {
  assert.deepEqual(resolveRange(shiftPeriod({ granularity: 'month', anchor: '2026-10-15' }, -1)), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(resolveRange(shiftPeriod({ granularity: 'month', anchor: '2026-12-15' }, 1)), { from: '2027-01-01', to: '2027-01-31' });
  assert.deepEqual(resolveRange(shiftPeriod({ granularity: 'week', anchor: '2026-10-08' }, 1)), { from: '2026-10-12', to: '2026-10-18' });
});

test('chart buckets scale with the range and cover it exactly once', () => {
  assert.equal(bucketFor({ from: '2026-10-01', to: '2026-10-31' }), 'day');
  assert.equal(bucketFor({ from: '2026-07-01', to: '2026-09-30' }), 'week');
  assert.equal(bucketFor({ from: '2026-01-01', to: '2026-12-31' }), 'month');
  const starts = bucketStarts({ from: '2026-10-01', to: '2026-10-31' }, 'day');
  assert.equal(starts.length, 31);
  assert.equal(bucketIndex(starts, '2026-10-15'), 14);
  const months = bucketStarts({ from: '2026-01-15', to: '2026-04-10' }, 'month');
  assert.deepEqual(months, ['2026-01-15', '2026-02-01', '2026-03-01', '2026-04-01']);
});

test('budget proration helpers', () => {
  assert.deepEqual(monthsTouched({ from: '2026-09-10', to: '2026-10-09' }), ['2026-09-01', '2026-10-01']);
  assert.deepEqual(overlapWithMonth({ from: '2026-09-10', to: '2026-10-09' }, '2026-09-01'), { overlap: 21, monthDays: 30 });
  assert.deepEqual(overlapWithMonth({ from: '2026-10-01', to: '2026-10-31' }, '2026-10-01'), { overlap: 31, monthDays: 31 });
});

/* ---------------- csv / mapping / brand ---------------- */

test('csvText quotes fields and neutralises spreadsheet formulas', () => {
  assert.equal(csvText('plain'), '"plain"');
  assert.equal(csvText('say "hi"'), '"say ""hi"""');
  assert.equal(csvText('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  for (const lead of ['+', '-', '@']) assert.ok(csvText(`${lead}1`).startsWith(`"'${lead}`));
  assert.equal(csvText(null), '""');
});

const apiTx = {
  id: 'tx1', description: 'Bookings', descriptionAr: null, amount: 148500, currency: 'LYD', type: 'INCOME', status: 'PAID',
  category: 'Customer Collection', categoryAr: null, transactionDate: '2026-10-08T00:00:00.000Z', paymentMethod: 'BANK_TRANSFER',
  paymentProvider: null, externalReference: null, platform: { id: 'p1', name: 'A-Stay Bookings', code: 'A-STAY' }, account: null, accountId: null,
};

test('mapApiTransaction converts the API shape into the UI shape', () => {
  const t = mapApiTransaction(apiTx);
  assert.equal(t.type, 'inflow');
  assert.equal(t.status, 'paid');
  assert.equal(t.date, '2026-10-08');
  assert.equal(t.month, '2026-10');
  assert.equal(t.source, 'A-Stay');
  assert.equal(t.descriptionAr, 'Bookings');
  const out = mapApiTransaction({ ...apiTx, type: 'EXPENSE', status: 'UPCOMING', platform: null, paymentMethod: 'WEIRD' });
  assert.equal(out.type, 'outflow');
  assert.equal(out.source, 'Corporate');
  assert.equal(out.paymentMethod, 'OTHER');
});

test('transactionsToCsv leaves amounts numeric and marks the data set as demo', () => {
  const [header, row] = transactionsToCsv([mapApiTransaction(apiTx)]).split('\r\n');
  assert.ok(header.includes('"DataSet"'));
  assert.ok(row.includes(',148500,'));
  assert.ok(row.endsWith('"DEMO — fictional data"'));
});

test('keepBrandNames keeps brand names in Latin script inside Arabic text', () => {
  assert.equal(keepBrandNames('حجوزات أي-ستاي'), 'حجوزات A-Stay');
  assert.equal(keepBrandNames('وحدات أعمال أ-جروب'), 'وحدات أعمال A-Group');
  assert.equal(keepBrandNames('already A-Stay'), 'already A-Stay');
});

/* ---------------- analytics ---------------- */

test('pctChange never invents a percentage when the base month is empty', () => {
  assert.equal(pctChange(100, 0), null);
  assert.equal(pctChange(150, 100), 50);
  assert.equal(pctChange(50, 100), -50);
});

test('compareBy groups two months per key, one currency, using the recognition rules', () => {
  const tx = (o) => ({ id: Math.random().toString(), currency: 'LYD', type: 'outflow', status: 'paid', source: 'A-Stay', category: 'Ads', categoryAr: 'x', amount: 10, month: '2026-10', ...o });
  const rows = [tx({ amount: 100 }), tx({ amount: 40, month: '2026-09' }), tx({ amount: 999, status: 'upcoming' }), tx({ amount: 999, currency: 'USD' }), tx({ amount: 5, category: 'Rent' })];
  const out = compareBy(rows, { kind: 'expense', currency: 'LYD', month: '2026-10', previousMonth: '2026-09', language: 'en', groupKey: (x) => x.category, label: (x) => x.category });
  assert.deepEqual(out.map((o) => [o.key, o.current, o.previous]), [['Ads', 100, 40], ['Rent', 5, 0]]);
});

/* ---------------- billing ---------------- */

test('monthlyNormalized converts billing intervals to a monthly value', () => {
  assert.equal(monthlyNormalized(100, 'MONTHLY'), 100);
  assert.equal(monthlyNormalized(300, 'QUARTERLY'), 100);
  assert.equal(monthlyNormalized(1200, 'YEARLY'), 100);
});

test('MRR counts ACTIVE subscriptions only and never mixes currencies', () => {
  const subs = [
    { status: 'ACTIVE', price: 950, currency: 'LYD', interval: 'MONTHLY' },
    { status: 'ACTIVE', price: 1200, currency: 'USD', interval: 'YEARLY' },
    { status: 'TRIAL', price: 600, currency: 'LYD', interval: 'MONTHLY' },
    { status: 'PAST_DUE', price: 120, currency: 'LYD', interval: 'MONTHLY' },
    { status: 'CANCELED', price: 450, currency: 'LYD', interval: 'MONTHLY' },
  ];
  assert.deepEqual(mrrByCurrency(subs), { LYD: 950, USD: 100 });
});

const inv = (o) => ({ total: 100, currency: 'LYD', issueDate: '2026-10-01', dueDate: '2026-10-20', status: 'ISSUED', ...o });

test('overdue is derived from the due date, never stored', () => {
  assert.equal(derivedInvoiceStatus({ status: 'ISSUED', dueDate: '2026-10-14' }, '2026-10-15'), 'overdue');
  assert.equal(derivedInvoiceStatus({ status: 'ISSUED', dueDate: '2026-10-15' }, '2026-10-15'), 'issued'); // due today is not overdue yet
  assert.equal(derivedInvoiceStatus({ status: 'PAID', dueDate: '2020-01-01' }, '2026-10-15'), 'paid');
});

test('collections count only SUCCEEDED payments', () => {
  const out = invoicedCollected(
    [inv({ total: 500 }), inv({ total: 300, status: 'PAID' }), inv({ total: 999, status: 'DRAFT' }), inv({ total: 999, status: 'VOID' })],
    [
      { amount: 300, currency: 'LYD', date: '2026-10-02', status: 'SUCCEEDED' },
      { amount: 500, currency: 'LYD', date: '2026-10-03', status: 'FAILED' },
      { amount: 500, currency: 'LYD', date: '2026-10-03', status: 'PENDING' },
    ]
  );
  assert.deepEqual(out.LYD, { invoiced: 800, collected: 300, outstanding: 500 });
  assert.deepEqual(out.USD, { invoiced: 0, collected: 0, outstanding: 0 });
});

test('aging puts every outstanding invoice in exactly one bucket', () => {
  const today = '2026-10-15';
  const invoices = [
    inv({ total: 1, dueDate: '2026-10-20' }), // not due
    inv({ total: 2, dueDate: '2026-10-01' }), // 14 days
    inv({ total: 4, dueDate: '2026-08-20' }), // 56 days
    inv({ total: 8, dueDate: '2026-07-20' }), // 87 days
    inv({ total: 16, dueDate: '2026-05-01' }), // 167 days
    inv({ total: 999, status: 'PAID', dueDate: '2026-01-01' }),
  ];
  const a = agingBuckets(invoices, today);
  assert.deepEqual([a.notDue.LYD, a.d30.LYD, a.d60.LYD, a.d90.LYD, a.d90p.LYD], [1, 2, 4, 8, 16]);
});

test('financial position: paid, outstanding and expected by month end', () => {
  const today = '2026-10-15';
  const pos = financialPosition({
    currency: 'LYD',
    today,
    range: { from: '2026-10-01', to: '2026-10-31' },
    previousRange: { from: '2026-09-01', to: '2026-09-30' },
    invoices: [
      inv({ total: 100, dueDate: '2026-10-01' }), // overdue
      inv({ total: 200, dueDate: '2026-10-25' }), // due later this month
      inv({ total: 400, dueDate: '2026-11-10' }), // next month: outstanding, NOT expected by month end
      inv({ total: 50, status: 'PAID' }),
      inv({ total: 77, currency: 'USD', dueDate: '2026-10-20' }), // other currency ignored
    ],
    payments: [
      { amount: 50, currency: 'LYD', date: '2026-10-03', status: 'SUCCEEDED' },
      { amount: 30, currency: 'LYD', date: '2026-09-03', status: 'SUCCEEDED' },
      { amount: 99, currency: 'LYD', date: '2026-10-04', status: 'FAILED' },
    ],
  });
  assert.equal(pos.paid, 50);
  assert.equal(pos.paidPrevious, 30);
  assert.equal(pos.outstanding, 700);
  assert.equal(pos.overdue, 100);
  assert.equal(pos.notYetDue, 600);
  assert.equal(pos.expectedByMonthEnd, 300);
  assert.equal(pos.dueLaterThisMonth, 200);
  assert.equal(pos.monthEnd, '2026-10-31');
});

/* ---------------- permissions & auth harness ---------------- */

test('role permissions are cumulative and least-privilege', () => {
  assert.equal(can('READ_ONLY', 'dashboard:view'), true);
  assert.equal(can('READ_ONLY', 'transactions:view'), false);
  assert.equal(can('ANALYST', 'transactions:view'), true);
  assert.equal(can('ANALYST', 'customers:view'), false);
  assert.equal(can('FINANCE', 'customers:view'), true);
  assert.equal(can('FINANCE', 'users:manage'), false);
  assert.equal(can('ADMIN', 'users:manage'), true);
  assert.equal(can(null, 'dashboard:view'), false);
  for (const r of ['READ_ONLY', 'ANALYST', 'FINANCE']) assert.ok(!ROLE_PERMISSIONS[r].includes('users:manage'), r);
});

test('every UI route maps to a permission', () => {
  assert.equal(permissionForPath('/'), 'dashboard:view');
  assert.equal(permissionForPath('/customers/cus_001'), 'customers:view');
  assert.equal(permissionForPath('/reports'), 'reports:view');
  assert.equal(permissionForPath('/settings'), 'settings:view');
});

test('the dev auth harness is impossible outside development', () => {
  assert.equal(devBypassRole({ NODE_ENV: 'development', DEV_AUTH_BYPASS_ROLE: 'ADMIN' }), 'ADMIN');
  assert.equal(devBypassRole({ NODE_ENV: 'production', DEV_AUTH_BYPASS_ROLE: 'ADMIN' }), null);
  assert.equal(devBypassRole({ NODE_ENV: 'test', DEV_AUTH_BYPASS_ROLE: 'ADMIN' }), null);
  assert.equal(devBypassRole({ DEV_AUTH_BYPASS_ROLE: 'ADMIN' }), null);
  assert.equal(devBypassRole({ NODE_ENV: 'development', DEV_AUTH_BYPASS_ROLE: 'ROOT' }), null);
  assert.equal(devBypassRole({ NODE_ENV: 'development' }), null);
});
