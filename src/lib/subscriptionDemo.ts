/**
 * FICTIONAL DEMO DATA for organizations, customers, plans, subscriptions, invoices and payments.
 * Source for prisma/seed.ts only (the app reads everything from the database). No real customer data,
 * no payment processing.
 *
 * Dates are fixed (no `Date.now()`), rebased so that "today" is DEMO_TODAY.
 */

export type Cur = 'LYD' | 'USD';
export type Interval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type SubStatus = 'active' | 'trial' | 'past_due' | 'paused' | 'canceled' | 'expired';
export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'void';
export type PaymentStatus = 'succeeded' | 'failed' | 'pending';
export type CustomerType = 'individual' | 'small_business' | 'medium_business' | 'enterprise' | 'public_sector';

export const DEMO_TODAY = '2026-10-14';

/* ---- date helpers (UTC, ISO yyyy-mm-dd) ---- */
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Rebase the reference dataset (authored around 2025-11-20) onto DEMO_TODAY. */
const SHIFT_DAYS = 328;
const S = (iso: string): string => addDays(iso, SHIFT_DAYS);
const S0 = (iso: string | null): string | null => (iso ? S(iso) : null);

export interface Org {
  id: string;
  name: string;
  kind: 'internal' | 'external';
  industry: string;
  city: string;
  country: string;
  email: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Customer {
  id: string;
  type: CustomerType;
  displayName: string;
  businessName: string | null;
  orgId: string | null;
  email: string;
  phone: string | null;
  city: string;
  country: string;
  status: 'active' | 'inactive';
  createdAt: string;
  notes: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  ownerOrgId: string;
  description: string;
}

export interface Plan {
  id: string;
  productId: string;
  name: string;
  interval: Interval;
  price: number;
  currency: Cur;
  trialDays: number;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: SubStatus;
  startDate: string;
  nextRenewal: string | null;
  canceledDate: string | null;
}

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  subscriptionId: string | null;
  planId: string | null;
  currency: Cur;
  total: number;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  status: InvoiceStatus;
  note: string | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  date: string;
  amount: number;
  currency: Cur;
  method: string;
  status: PaymentStatus;
}

export const ORGS: Org[] = [
  { id: 'org_001', name: 'Nova Retail Group', kind: 'external', industry: 'Retail', city: 'Tripoli', country: 'Libya', email: 'info@novaretail.example', status: 'active', createdAt: S('2025-01-18') },
  { id: 'org_002', name: 'Sahara Logistics Co.', kind: 'external', industry: 'Logistics', city: 'Benghazi', country: 'Libya', email: 'contact@sahara-log.example', status: 'active', createdAt: S('2025-01-05') },
  { id: 'org_003', name: 'Medina Tech Solutions', kind: 'external', industry: 'Technology', city: 'Tripoli', country: 'Libya', email: 'hello@medinatech.example', status: 'active', createdAt: S('2025-03-01') },
  { id: 'org_004', name: 'A-Group Software Division', kind: 'internal', industry: 'Software', city: 'Tripoli', country: 'Libya', email: 'sw@agroup.example', status: 'active', createdAt: S('2024-11-01') },
  { id: 'org_005', name: 'Blue Nile Foods', kind: 'external', industry: 'Food & Beverage', city: 'Misrata', country: 'Libya', email: 'office@bluenile.example', status: 'inactive', createdAt: S('2025-02-20') },
];

export const CUSTOMERS: Customer[] = [
  { id: 'cus_001', type: 'individual', displayName: 'Amira Hassan', businessName: null, orgId: null, email: 'amira.hassan@example.test', phone: '+218-91-000-0001', city: 'Tripoli', country: 'Libya', status: 'active', createdAt: S('2025-02-11'), notes: 'Prefers email contact.' },
  { id: 'cus_002', type: 'medium_business', displayName: 'Nova Retail Group', businessName: 'Nova Retail Group', orgId: 'org_001', email: 'accounts@novaretail.example', phone: '+218-21-000-0002', city: 'Tripoli', country: 'Libya', status: 'active', createdAt: S('2025-01-20'), notes: null },
  { id: 'cus_003', type: 'enterprise', displayName: 'Sahara Logistics Co.', businessName: 'Sahara Logistics Co.', orgId: 'org_002', email: 'finance@sahara-log.example', phone: '+218-61-000-0003', city: 'Benghazi', country: 'Libya', status: 'active', createdAt: S('2025-01-08'), notes: null },
  { id: 'cus_004', type: 'individual', displayName: 'Yusuf Benali', businessName: null, orgId: null, email: 'yusuf.b@example.test', phone: null, city: 'Tripoli', country: 'Libya', status: 'active', createdAt: S('2025-05-14'), notes: null },
  { id: 'cus_005', type: 'small_business', displayName: 'Medina Tech Solutions', businessName: 'Medina Tech Solutions', orgId: 'org_003', email: 'admin@medinatech.example', phone: null, city: 'Tripoli', country: 'Libya', status: 'active', createdAt: S('2025-03-03'), notes: null },
  { id: 'cus_006', type: 'medium_business', displayName: 'Blue Nile Foods', businessName: 'Blue Nile Foods', orgId: 'org_005', email: 'office@bluenile.example', phone: null, city: 'Misrata', country: 'Libya', status: 'inactive', createdAt: S('2025-02-02'), notes: 'Subscription canceled.' },
  { id: 'cus_007', type: 'individual', displayName: 'Fatima Al-Zawi', businessName: null, orgId: null, email: 'fatima.z@example.test', phone: null, city: 'Benghazi', country: 'Libya', status: 'active', createdAt: S('2025-06-21'), notes: null },
  { id: 'cus_008', type: 'public_sector', displayName: 'Ministry of Services (Demo)', businessName: 'Ministry of Services (Demo)', orgId: null, email: 'procurement@services-demo.example', phone: null, city: 'Tripoli', country: 'Libya', status: 'active', createdAt: S('2025-11-01'), notes: 'Fictional public-sector demo customer.' },
  { id: 'cus_009', type: 'small_business', displayName: 'Tariq Electrical Supplies', businessName: 'Tariq Electrical Supplies', orgId: null, email: 'tariq.elec@example.test', phone: null, city: 'Tripoli', country: 'Libya', status: 'active', createdAt: S('2025-04-17'), notes: null },
  { id: 'cus_010', type: 'individual', displayName: 'Layla Mansour', businessName: null, orgId: null, email: 'layla.m@example.test', phone: null, city: 'Tripoli', country: 'Libya', status: 'inactive', createdAt: S('2025-03-25'), notes: 'No active services.' },
  { id: 'cus_011', type: 'enterprise', displayName: 'Coastline Hotels', businessName: 'Coastline Hotels', orgId: null, email: 'it@coastlinehotels.example', phone: null, city: 'Tripoli', country: 'Libya', status: 'active', createdAt: S('2025-09-09'), notes: null },
  { id: 'cus_012', type: 'individual', displayName: 'Omar Khaled', businessName: null, orgId: null, email: 'omar.k@example.test', phone: null, city: 'Misrata', country: 'Libya', status: 'active', createdAt: S('2025-10-14'), notes: null },
];

export const PRODUCTS: Product[] = [
  { id: 'prd_001', name: 'Atlas ERP', category: 'Software', ownerOrgId: 'org_004', description: 'Modular enterprise resource planning for growing businesses.' },
  { id: 'prd_002', name: 'Nimbus Cloud Backup', category: 'Cloud Services', ownerOrgId: 'org_004', description: 'Automated encrypted cloud backup and restore.' },
  { id: 'prd_003', name: 'Sentinel Monitoring', category: 'Security', ownerOrgId: 'org_004', description: 'Uptime and security monitoring with alerting.' },
  { id: 'prd_004', name: 'Ledger Payroll', category: 'Finance Software', ownerOrgId: 'org_004', description: 'Payroll and benefits administration.' },
  { id: 'prd_005', name: 'Fleet Track', category: 'Logistics Software', ownerOrgId: 'org_004', description: 'Vehicle tracking and route management.' },
  { id: 'prd_006', name: 'Deskline Support', category: 'Support Services', ownerOrgId: 'org_004', description: 'Helpdesk and support desk services.' },
];

export const PLANS: Plan[] = [
  { id: 'plan_001', productId: 'prd_001', name: 'Starter', interval: 'monthly', price: 450, currency: 'LYD', trialDays: 0 },
  { id: 'plan_002', productId: 'prd_001', name: 'Business', interval: 'monthly', price: 950, currency: 'LYD', trialDays: 0 },
  { id: 'plan_003', productId: 'prd_001', name: 'Enterprise', interval: 'monthly', price: 2200, currency: 'LYD', trialDays: 0 },
  { id: 'plan_004', productId: 'prd_002', name: 'Basic', interval: 'monthly', price: 9, currency: 'USD', trialDays: 0 },
  { id: 'plan_005', productId: 'prd_002', name: 'Pro', interval: 'monthly', price: 24, currency: 'USD', trialDays: 0 },
  { id: 'plan_006', productId: 'prd_002', name: 'Pro Annual', interval: 'yearly', price: 230, currency: 'USD', trialDays: 14 },
  { id: 'plan_007', productId: 'prd_003', name: 'Standard', interval: 'monthly', price: 300, currency: 'LYD', trialDays: 0 },
  { id: 'plan_008', productId: 'prd_003', name: 'Premium', interval: 'monthly', price: 780, currency: 'LYD', trialDays: 0 },
  { id: 'plan_009', productId: 'prd_004', name: 'Core', interval: 'monthly', price: 600, currency: 'LYD', trialDays: 7 },
  { id: 'plan_010', productId: 'prd_004', name: 'Enterprise', interval: 'monthly', price: 1400, currency: 'LYD', trialDays: 0 },
  { id: 'plan_011', productId: 'prd_005', name: 'Fleet 10', interval: 'monthly', price: 49, currency: 'USD', trialDays: 0 },
  { id: 'plan_012', productId: 'prd_005', name: 'Fleet 50', interval: 'monthly', price: 199, currency: 'USD', trialDays: 0 },
  { id: 'plan_013', productId: 'prd_006', name: 'Email Only', interval: 'monthly', price: 120, currency: 'LYD', trialDays: 0 },
  { id: 'plan_014', productId: 'prd_006', name: 'Priority', interval: 'quarterly', price: 380, currency: 'LYD', trialDays: 0 },
];

type SubSeed = [string, string, string, SubStatus, string, string | null, string | null];
const SUB_SEED: SubSeed[] = [
  ['sub_001', 'cus_002', 'plan_002', 'active', '2025-02-01', '2025-12-01', null],
  ['sub_002', 'cus_003', 'plan_003', 'active', '2025-01-15', '2025-12-15', null],
  ['sub_003', 'cus_006', 'plan_001', 'canceled', '2025-03-10', null, '2025-09-30'],
  ['sub_004', 'cus_009', 'plan_007', 'expired', '2024-12-01', null, '2025-10-31'],
  ['sub_005', 'cus_005', 'plan_009', 'active', '2025-04-05', '2025-12-05', null],
  ['sub_006', 'cus_001', 'plan_001', 'active', '2025-05-20', '2025-12-20', null],
  ['sub_007', 'cus_011', 'plan_010', 'active', '2025-03-02', '2025-12-02', null],
  ['sub_008', 'cus_007', 'plan_014', 'active', '2025-06-10', '2025-12-10', null],
  ['sub_009', 'cus_003', 'plan_012', 'active', '2025-02-18', '2025-12-18', null],
  ['sub_010', 'cus_002', 'plan_005', 'active', '2025-07-01', '2025-12-01', null],
  ['sub_011', 'cus_011', 'plan_011', 'paused', '2025-05-15', null, null],
  ['sub_012', 'cus_005', 'plan_006', 'active', '2025-08-01', '2026-08-01', null],
  ['sub_013', 'cus_004', 'plan_004', 'active', '2025-09-14', '2025-12-14', null],
  ['sub_014', 'cus_008', 'plan_009', 'trial', '2025-11-20', '2025-12-04', null],
  ['sub_015', 'cus_004', 'plan_005', 'trial', '2025-11-15', '2025-11-29', null],
  ['sub_016', 'cus_006', 'plan_013', 'past_due', '2025-04-01', '2025-11-01', null],
];

export const SUBSCRIPTIONS: Subscription[] = SUB_SEED.map(([id, customerId, planId, status, start, renewal, canceled]) => ({
  id,
  customerId,
  planId,
  status,
  startDate: S(start),
  nextRenewal: S0(renewal),
  canceledDate: S0(canceled),
}));

/* ---- invoices ---- */
type InvSeed = [string, string | null, Cur, number, string, string, string | null, InvoiceStatus | null, string | null];
// [customer, subscription, currency, total, issue, due, paidDate, forcedStatus, note]
const INV_SEED: InvSeed[] = [
  ['cus_002', 'sub_001', 'LYD', 950, '2025-02-01', '2025-02-15', '2025-02-10', null, null],
  ['cus_003', 'sub_002', 'LYD', 2200, '2025-02-01', '2025-02-15', '2025-02-12', null, null],
  ['cus_002', 'sub_001', 'LYD', 950, '2025-03-01', '2025-03-15', '2025-03-11', null, null],
  ['cus_003', 'sub_002', 'LYD', 2200, '2025-03-01', '2025-03-15', '2025-03-20', null, null],
  ['cus_005', 'sub_005', 'LYD', 600, '2025-04-05', '2025-04-19', '2025-04-15', null, null],
  ['cus_002', 'sub_001', 'LYD', 950, '2025-04-01', '2025-04-15', '2025-04-10', null, null],
  ['cus_003', 'sub_009', 'USD', 199, '2025-04-18', '2025-05-02', '2025-04-25', null, null],
  ['cus_002', 'sub_001', 'LYD', 950, '2025-05-01', '2025-05-15', '2025-05-13', null, null],
  ['cus_011', 'sub_007', 'LYD', 1400, '2025-05-02', '2025-05-16', '2025-05-20', null, null],
  ['cus_001', 'sub_006', 'LYD', 450, '2025-06-20', '2025-07-04', '2025-06-28', null, null],
  ['cus_002', 'sub_001', 'LYD', 950, '2025-06-01', '2025-06-15', '2025-06-05', null, null],
  ['cus_003', 'sub_002', 'LYD', 2200, '2025-06-01', '2025-06-15', '2025-06-03', null, null],
  ['cus_002', 'sub_001', 'LYD', 950, '2025-07-01', '2025-07-15', '2025-07-08', null, null],
  ['cus_011', 'sub_007', 'LYD', 1400, '2025-08-02', '2025-08-16', '2025-08-06', null, null],
  ['cus_002', 'sub_001', 'LYD', 950, '2025-09-01', '2025-09-15', '2025-09-09', null, null],
  ['cus_003', 'sub_002', 'LYD', 2200, '2025-10-01', '2025-10-15', '2025-10-04', null, null],
  ['cus_003', 'sub_002', 'LYD', 2200, '2025-08-15', '2025-08-30', null, null, null],
  ['cus_003', 'sub_009', 'USD', 199, '2025-10-15', '2025-10-30', null, null, null],
  ['cus_006', 'sub_016', 'LYD', 450, '2025-08-01', '2025-08-15', null, null, null],
  ['cus_002', 'sub_001', 'LYD', 950, '2025-11-10', '2025-11-25', null, null, null],
  ['cus_005', 'sub_005', 'LYD', 600, '2025-11-10', '2025-11-25', null, null, null],
  ['cus_007', 'sub_008', 'LYD', 380, '2025-11-18', '2025-12-02', null, 'draft', null],
  ['cus_006', 'sub_016', 'LYD', 120, '2025-09-01', '2025-09-15', null, 'void', 'Canceled before issue — demo void record.'],
];

export const INVOICES: Invoice[] = INV_SEED.map(([customerId, subId, currency, total, issue, due, paid, forced, note], i) => {
  const sub = subId ? SUB_SEED.find((s) => s[0] === subId) : undefined;
  const dueS = S(due);
  const status: InvoiceStatus = forced ?? (paid ? 'paid' : dueS < DEMO_TODAY ? 'overdue' : 'issued');
  const n = i + 1;
  return {
    id: `inv_${String(n).padStart(3, '0')}`,
    number: `INV-2026-${String(n).padStart(4, '0')}`,
    customerId,
    subscriptionId: subId,
    planId: sub ? sub[2] : null,
    currency,
    total,
    issueDate: S(issue),
    dueDate: dueS,
    paidDate: S0(paid),
    status,
    note,
  };
});

export const PAYMENTS: Payment[] = [
  ...INVOICES.filter((inv) => inv.status === 'paid').map((inv, i): Payment => ({
    id: `pay_${inv.id}`,
    invoiceId: inv.id,
    invoiceNumber: inv.number,
    customerId: inv.customerId,
    date: inv.paidDate as string,
    amount: inv.total,
    currency: inv.currency,
    method: i % 2 ? 'Card on file (simulated)' : 'Bank transfer (simulated)',
    status: 'succeeded',
  })),
  { id: 'pay_x01', invoiceId: 'inv_017', invoiceNumber: 'INV-2026-0017', customerId: 'cus_003', date: S('2025-10-05'), amount: 2200, currency: 'LYD', method: 'Card on file (simulated)', status: 'failed' },
  { id: 'pay_x02', invoiceId: 'inv_020', invoiceNumber: 'INV-2026-0020', customerId: 'cus_002', date: S('2025-11-18'), amount: 950, currency: 'LYD', method: 'Bank transfer (simulated)', status: 'pending' },
];
