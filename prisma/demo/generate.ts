/**
 * Deterministic generator for the large SYNTHETIC demo dataset (2,000 customers and everything connected).
 *
 * - Pure: no database, no network, no imports. The same seed always yields the same data and the same ids.
 * - Fictional only: people, businesses and "public-sector" organizations are invented and labelled as such;
 *   emails use the reserved example.com domain; phone numbers use a clearly non-assignable block.
 * - Currencies are never combined or converted. Every monetary row carries its own currency.
 * - Payments are SIMULATED records. Nothing here contacts a payment provider.
 *
 * The database writer is prisma/seed-demo-scale.ts; the offline validator is scripts/demo-validate.mjs.
 */

export type Cur = 'LYD' | 'USD';
export type CustomerType = 'INDIVIDUAL' | 'SMALL_BUSINESS' | 'MEDIUM_BUSINESS' | 'ENTERPRISE' | 'PUBLIC_SECTOR';
export type SubStatus = 'ACTIVE' | 'TRIAL' | 'PAST_DUE' | 'PAUSED' | 'CANCELED' | 'EXPIRED';
export type Interval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface CatalogPlan {
  id: string;
  productId: string;
  name: string;
  interval: Interval;
  price: number;
  currency: Cur;
  trialDays: number;
}
export interface Catalog {
  plans: CatalogPlan[];
}

export const SEGMENT_COUNTS: Record<CustomerType, number> = {
  INDIVIDUAL: 1200,
  SMALL_BUSINESS: 500,
  MEDIUM_BUSINESS: 200,
  ENTERPRISE: 80,
  PUBLIC_SECTOR: 20,
};
export const TOTAL_CUSTOMERS = 2000;

export const DEMO_SEED = 20261015;
export const DEMO_AS_OF = '2026-10-14';
/** Invoices / payments / transactions are generated for this window only (keeps the dataset in the target ranges). */
export const BILLING_WINDOW_START = '2026-08-01';
export const TENANT_ORG_ID = 'org-a-group-holding';

/* ------------------------------------------------------------------ output rows (database-ready) */

export interface OrgRow {
  id: string;
  name: string;
  kind: 'EXTERNAL';
  industry: string;
  city: string;
  country: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}
export interface CustomerRow {
  id: string;
  organizationId: string;
  type: CustomerType;
  displayName: string;
  businessName: string | null;
  linkedOrganizationId: string | null;
  email: string;
  phone: string;
  city: string;
  country: string;
  status: 'ACTIVE' | 'INACTIVE';
  notes: string;
  createdAt: string;
}
export interface SubscriptionRow {
  id: string;
  organizationId: string;
  customerId: string;
  planId: string;
  status: SubStatus;
  startDate: string;
  nextRenewal: string | null;
  canceledDate: string | null;
  price: number;
  currency: Cur;
  interval: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}
export interface InvoiceRow {
  id: string;
  organizationId: string;
  number: string;
  customerId: string;
  subscriptionId: string;
  currency: Cur;
  total: number;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  status: 'ISSUED' | 'PAID' | 'VOID';
  note: string;
}
export interface PaymentRow {
  id: string;
  organizationId: string;
  invoiceId: string;
  customerId: string;
  date: string;
  amount: number;
  currency: Cur;
  method: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
}
export interface TransactionRow {
  id: string;
  organizationId: string;
  description: string;
  descriptionAr: string;
  amount: number;
  currency: Cur;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'UPCOMING';
  category: string;
  categoryAr: string;
  transactionDate: string;
  dueDate: string | null;
  reference: string;
  platformId: string;
  paymentMethod: 'CASH' | 'LOCAL_CARD' | 'INTERNATIONAL_CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET';
  accountId: string;
}
export interface BudgetRow {
  organizationId: string;
  month: string;
  currency: Cur;
  amount: number;
}

export interface ScaleDataset {
  seed: number;
  asOf: string;
  organizations: OrgRow[];
  customers: CustomerRow[];
  subscriptions: SubscriptionRow[];
  invoices: InvoiceRow[];
  payments: PaymentRow[];
  transactions: TransactionRow[];
  budgets: BudgetRow[];
}

/* ------------------------------------------------------------------ deterministic helpers */

function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
type Rng = () => number;

const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
function weighted<T>(r: Rng, items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((s, w) => s + w, 0);
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= weights[i];
    if (x < 0) return items[i];
  }
  return items[items.length - 1];
}
function shuffle<T>(r: Rng, arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const round2 = (n: number) => Math.round(n * 100) / 100;

const DAY = 86400000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => toIso(toMs(iso) + n * DAY);
const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY);
const monthStart = (iso: string) => `${iso.slice(0, 8)}01`;
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const endOfMonth = (iso: string) => `${iso.slice(0, 8)}${String(daysInMonth(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)))).padStart(2, '0')}`;

/** Add whole months; the day of month is capped at 28 so anniversaries are stable. */
function addMonths(iso: string, n: number): string {
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7)) - 1 + n;
  const day = Math.min(Number(iso.slice(8, 10)), 28);
  const yy = y + Math.floor(m / 12);
  const mm = ((m % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function step(iso: string, interval: Interval, k: number): string {
  if (interval === 'weekly') return addDays(iso, 7 * k);
  if (interval === 'monthly') return addMonths(iso, k);
  if (interval === 'quarterly') return addMonths(iso, 3 * k);
  return addMonths(iso, 12 * k);
}

const pad = (n: number, w: number) => String(n).padStart(w, '0');
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* ------------------------------------------------------------------ fictional name pools [English, Arabic] */

const MALE: [string, string][] = [
  ['Ahmed', 'أحمد'], ['Mohamed', 'محمد'], ['Mahmoud', 'محمود'], ['Ali', 'علي'], ['Omar', 'عمر'], ['Khaled', 'خالد'], ['Hassan', 'حسن'], ['Hussein', 'حسين'],
  ['Ibrahim', 'إبراهيم'], ['Yousef', 'يوسف'], ['Mustafa', 'مصطفى'], ['Abdullah', 'عبد الله'], ['Abdulrahman', 'عبد الرحمن'], ['Salem', 'سالم'], ['Salah', 'صلاح'],
  ['Faisal', 'فيصل'], ['Tariq', 'طارق'], ['Nasser', 'ناصر'], ['Idris', 'إدريس'], ['Fathi', 'فتحي'], ['Jamal', 'جمال'], ['Karim', 'كريم'], ['Mansour', 'منصور'],
  ['Rashid', 'راشد'], ['Saad', 'سعد'], ['Walid', 'وليد'], ['Anas', 'أنس'], ['Bilal', 'بلال'], ['Hamza', 'حمزة'], ['Zakaria', 'زكريا'], ['Mehdi', 'مهدي'],
  ['Sami', 'سامي'], ['Adel', 'عادل'], ['Ayman', 'أيمن'], ['Hisham', 'هشام'], ['Majdi', 'مجدي'], ['Nabil', 'نبيل'], ['Osama', 'أسامة'], ['Rami', 'رامي'], ['Suleiman', 'سليمان'],
];
const FEMALE: [string, string][] = [
  ['Fatima', 'فاطمة'], ['Aisha', 'عائشة'], ['Maryam', 'مريم'], ['Khadija', 'خديجة'], ['Zainab', 'زينب'], ['Amal', 'أمل'], ['Huda', 'هدى'], ['Nour', 'نور'],
  ['Salma', 'سلمى'], ['Hanan', 'حنان'], ['Asma', 'أسماء'], ['Safia', 'صفية'], ['Rania', 'رانيا'], ['Layla', 'ليلى'], ['Sara', 'سارة'], ['Nadia', 'نادية'],
  ['Samira', 'سميرة'], ['Malak', 'ملاك'], ['Rawan', 'روان'], ['Eman', 'إيمان'], ['Najat', 'نجاة'], ['Wafa', 'وفاء'], ['Hajer', 'هاجر'], ['Ruqayya', 'رقية'],
  ['Sumaya', 'سمية'], ['Inas', 'إيناس'], ['Marwa', 'مروة'], ['Dalal', 'دلال'], ['Lubna', 'لبنى'], ['Nuha', 'نهى'],
];
const FAMILY: [string, string][] = [
  ['Al-Mansouri', 'المنصوري'], ['Al-Warfalli', 'الورفلي'], ['Al-Zawi', 'الزاوي'], ['Al-Misrati', 'المصراتي'], ['Al-Tarhouni', 'الترهوني'], ['Al-Ghariani', 'الغرياني'],
  ['Bin Omran', 'بن عمران'], ['Al-Sharif', 'الشريف'], ['Al-Fitouri', 'الفيتوري'], ['Al-Mabrouk', 'المبروك'], ['Abu Zaid', 'أبو زيد'], ['Al-Hadi', 'الهادي'],
  ['Al-Jehani', 'الجهاني'], ['Al-Kikhia', 'الكيخيا'], ['Al-Barghathi', 'البرغثي'], ['Al-Shaibani', 'الشيباني'], ['Al-Dressi', 'الدريسي'], ['Al-Obeidi', 'العبيدي'],
  ['Al-Fakhri', 'الفخري'], ['Al-Mahdawi', 'المهدوي'], ['Al-Shtewi', 'الشطيوي'], ['Al-Hasi', 'الهاسي'], ['Al-Zintani', 'الزنتاني'], ['Al-Gadamsi', 'الغدامسي'],
  ['Al-Ajeeli', 'العجيلي'], ['Al-Nuwairi', 'النويري'], ['Al-Sanusi', 'السنوسي'], ['Al-Tajouri', 'التاجوري'], ['Al-Mashai', 'المشاي'], ['Al-Zwawi', 'الزواوي'],
  ['Bin Khayal', 'بن خيال'], ['Al-Sghaier', 'الصغير'], ['Al-Hamali', 'الحمالي'], ['Al-Drissi', 'الدرسي'], ['Al-Marimi', 'المريمي'], ['Al-Qadi', 'القاضي'],
  ['Al-Rifai', 'الرفاعي'], ['Al-Tabib', 'الطبيب'], ['Al-Bayoudi', 'البيوضي'], ['Al-Qatrani', 'القطراني'], ['Al-Abbar', 'العبار'], ['Al-Mabsout', 'المبسوط'],
  ['Al-Shalabi', 'الشلبي'], ['Al-Khoja', 'الخوجة'], ['Al-Ferjani', 'الفرجاني'], ['Al-Zaidi', 'الزيدي'], ['Al-Hawat', 'الهوات'], ['Al-Mehdi', 'المهدي'],
  ['Al-Aswad', 'الأسود'], ['Al-Sunni', 'السني'],
];

const BIZ_PREFIX: [string, string][] = [
  ['Al-Nour', 'النور'], ['Al-Amal', 'الأمل'], ['Al-Wafa', 'الوفاء'], ['Al-Salam', 'السلام'], ['Al-Fajr', 'الفجر'], ['Al-Manara', 'المنارة'], ['Al-Rayyan', 'الريان'],
  ['Al-Bahr', 'البحر'], ['Al-Safwa', 'الصفوة'], ['Al-Masar', 'المسار'], ['Al-Tahaddi', 'التحدي'], ['Al-Ufuq', 'الأفق'], ['Al-Hikma', 'الحكمة'], ['Al-Majd', 'المجد'],
  ['Al-Nakhil', 'النخيل'], ['Al-Zahra', 'الزهراء'], ['Al-Bashaer', 'البشائر'], ['Al-Ittihad', 'الاتحاد'], ['Al-Taqwa', 'التقوى'], ['Al-Shorouq', 'الشروق'],
  ['Al-Andalus', 'الأندلس'], ['Al-Mawred', 'المورد'], ['Al-Tamayuz', 'التميز'], ['Al-Najah', 'النجاح'], ['Al-Ibdaa', 'الإبداع'], ['Al-Riyada', 'الريادة'],
  ['Al-Gharb', 'الغرب'], ['Al-Sahel', 'الساحل'], ['Al-Waha', 'الواحة'], ['Al-Bidaya', 'البداية'],
];
const SECTORS: { en: string; ar: string; industry: string }[] = [
  { en: 'Trading', ar: 'للتجارة', industry: 'Trading' },
  { en: 'Pharmacy', ar: 'للصيدلة', industry: 'Healthcare' },
  { en: 'Bakery', ar: 'للمخابز', industry: 'Food & Beverage' },
  { en: 'Auto Parts', ar: 'لقطع غيار السيارات', industry: 'Automotive' },
  { en: 'Construction', ar: 'للمقاولات', industry: 'Construction' },
  { en: 'Logistics', ar: 'للخدمات اللوجستية', industry: 'Logistics' },
  { en: 'Medical Center', ar: 'للخدمات الطبية', industry: 'Healthcare' },
  { en: 'Printing', ar: 'للطباعة', industry: 'Media & Print' },
  { en: 'Travel & Tourism', ar: 'للسياحة والسفر', industry: 'Travel' },
  { en: 'Consulting', ar: 'للاستشارات', industry: 'Professional Services' },
  { en: 'IT Solutions', ar: 'لحلول تقنية المعلومات', industry: 'Technology' },
  { en: 'Food Industries', ar: 'للصناعات الغذائية', industry: 'Food & Beverage' },
  { en: 'Real Estate', ar: 'للعقارات', industry: 'Real Estate' },
  { en: 'Electronics', ar: 'للإلكترونيات', industry: 'Retail' },
  { en: 'Furniture', ar: 'للأثاث', industry: 'Retail' },
  { en: 'Training Center', ar: 'للتدريب', industry: 'Education' },
  { en: 'Fitness', ar: 'للياقة البدنية', industry: 'Wellness' },
  { en: 'Catering', ar: 'للتموين', industry: 'Food & Beverage' },
  { en: 'Fashion', ar: 'للأزياء', industry: 'Retail' },
  { en: 'Agriculture', ar: 'للزراعة', industry: 'Agriculture' },
  { en: 'Medical Supplies', ar: 'للمستلزمات الطبية', industry: 'Healthcare' },
  { en: 'Engineering', ar: 'للخدمات الهندسية', industry: 'Engineering' },
  { en: 'Cleaning Services', ar: 'لخدمات النظافة', industry: 'Facility Services' },
  { en: 'Telecom Services', ar: 'لخدمات الاتصالات', industry: 'Telecom' },
  { en: 'Energy Services', ar: 'لخدمات الطاقة', industry: 'Energy' },
  { en: 'Import & Export', ar: 'للاستيراد والتصدير', industry: 'Trading' },
  { en: 'Hotels & Hospitality', ar: 'للضيافة والفنادق', industry: 'Hospitality' },
  { en: 'Marketing', ar: 'للتسويق', industry: 'Marketing' },
];
const BIZ_SUFFIX: Record<'SMALL_BUSINESS' | 'MEDIUM_BUSINESS' | 'ENTERPRISE', { en: string[]; ar: string[] }> = {
  SMALL_BUSINESS: { en: ['Est.', 'Shop', 'Co.'], ar: ['مؤسسة', 'محل', 'شركة'] },
  MEDIUM_BUSINESS: { en: ['Company', 'Co. Ltd', 'Services'], ar: ['شركة', 'شركة', 'مركز'] },
  ENTERPRISE: { en: ['Group', 'Holding', 'Industries'], ar: ['مجموعة', 'مجموعة', 'مجموعة'] },
};

const CITIES = ['Tripoli', 'Benghazi', 'Misrata', 'Sabha', 'Zawiya', 'Bayda', 'Derna'] as const;
const CITY_WEIGHTS = [34, 22, 13, 7, 9, 8, 7];
const CITY_AR: Record<string, string> = { Tripoli: 'طرابلس', Benghazi: 'بنغازي', Misrata: 'مصراتة', Sabha: 'سبها', Zawiya: 'الزاوية', Bayda: 'البيضاء', Derna: 'درنة' };

const PUBLIC_DEPARTMENTS: { en: string; ar: string; industry: string }[] = [
  { en: 'Municipal Services Council', ar: 'مجلس الخدمات البلدية', industry: 'Local government (fictional)' },
  { en: 'Education Directorate', ar: 'مديرية التعليم', industry: 'Education (fictional)' },
  { en: 'Health Authority', ar: 'هيئة الصحة', industry: 'Healthcare (fictional)' },
  { en: 'Water Utility Office', ar: 'مكتب مرافق المياه', industry: 'Utilities (fictional)' },
  { en: 'Roads & Transport Office', ar: 'مكتب الطرق والنقل', industry: 'Transport (fictional)' },
  { en: 'Tourism Board', ar: 'مجلس السياحة', industry: 'Tourism (fictional)' },
  { en: 'Social Affairs Office', ar: 'مكتب الشؤون الاجتماعية', industry: 'Social services (fictional)' },
];

/* ------------------------------------------------------------------ operations pools */

const PAYMENT_METHODS = [
  { label: 'Bank transfer (simulated)', pm: 'BANK_TRANSFER' as const, w: 40 },
  { label: 'Card on file (simulated)', pm: 'LOCAL_CARD' as const, w: 28 },
  { label: 'Cash at branch (simulated)', pm: 'CASH' as const, w: 20 },
  { label: 'Digital wallet (simulated)', pm: 'DIGITAL_WALLET' as const, w: 12 },
];

/** Demo mapping of catalog products to the company's business platforms (seeded ids). */
const PRODUCT_PLATFORM: Record<string, string> = {
  prd_001: 'plat-tech-infra',
  prd_002: 'plat-tech-infra',
  prd_003: 'plat-tech-infra',
  prd_004: 'plat-corporate',
  prd_005: 'plat-a-market',
  prd_006: 'plat-a-space',
};
const PLATFORM_IDS = ['plat-a-stay', 'plat-a-market', 'plat-a-space', 'plat-corporate', 'plat-tech-infra'];

const EXPENSE_CATEGORIES: { en: string; ar: string; share: number; days: [number, number]; descEn: string; descAr: string }[] = [
  { en: 'Salaries & Payroll', ar: 'رواتب وأجور', share: 0.3, days: [24, 28], descEn: 'Payroll batch', descAr: 'دفعة الرواتب' },
  { en: 'Cloud Hosting & Infrastructure', ar: 'استضافة وبنية تحتية', share: 0.14, days: [1, 20], descEn: 'Hosting and infrastructure', descAr: 'الاستضافة والبنية التحتية' },
  { en: 'Marketing & Advertising', ar: 'التسويق والإعلان', share: 0.12, days: [1, 28], descEn: 'Advertising campaign', descAr: 'حملة إعلانية' },
  { en: 'Software Licenses', ar: 'تراخيص البرمجيات', share: 0.06, days: [1, 10], descEn: 'Software licence renewal', descAr: 'تجديد ترخيص برمجيات' },
  { en: 'Rent & Utilities', ar: 'إيجار ومرافق', share: 0.09, days: [1, 5], descEn: 'Rent and utilities', descAr: 'الإيجار والمرافق' },
  { en: 'Payment Processing Fees', ar: 'رسوم معالجة الدفع', share: 0.05, days: [2, 28], descEn: 'Payment processing fees', descAr: 'رسوم معالجة الدفع' },
  { en: 'Customer Support Operations', ar: 'عمليات دعم العملاء', share: 0.06, days: [1, 28], descEn: 'Customer support operations', descAr: 'عمليات دعم العملاء' },
  { en: 'Professional Services', ar: 'خدمات مهنية', share: 0.04, days: [3, 26], descEn: 'Professional services', descAr: 'خدمات مهنية' },
  { en: 'Travel & Logistics', ar: 'سفر ولوجستيات', share: 0.03, days: [1, 28], descEn: 'Travel and logistics', descAr: 'السفر واللوجستيات' },
  { en: 'Equipment & Maintenance', ar: 'معدات وصيانة', share: 0.05, days: [1, 28], descEn: 'Equipment and maintenance', descAr: 'المعدات والصيانة' },
  { en: 'Taxes & Licences', ar: 'ضرائب ورسوم', share: 0.04, days: [15, 28], descEn: 'Taxes and licence fees', descAr: 'الضرائب ورسوم التراخيص' },
];

/* ------------------------------------------------------------------ generation */

const SEGMENT_SUB_COUNTS: Record<CustomerType, { n: number[]; w: number[] }> = {
  INDIVIDUAL: { n: [0, 1, 2], w: [38, 50, 12] },
  SMALL_BUSINESS: { n: [0, 1, 2, 3], w: [10, 60, 25, 5] },
  MEDIUM_BUSINESS: { n: [1, 2, 3, 4], w: [40, 35, 20, 5] },
  ENTERPRISE: { n: [2, 3, 4, 5], w: [20, 30, 30, 20] },
  PUBLIC_SECTOR: { n: [2, 3, 4], w: [30, 40, 30] },
};
const UNITS: Record<CustomerType, [number, number]> = {
  INDIVIDUAL: [1, 1],
  SMALL_BUSINESS: [1, 2],
  MEDIUM_BUSINESS: [1, 5],
  ENTERPRISE: [3, 18],
  PUBLIC_SECTOR: [5, 25],
};
const DUE_DAYS: Record<CustomerType, number> = { INDIVIDUAL: 14, SMALL_BUSINESS: 14, MEDIUM_BUSINESS: 21, ENTERPRISE: 30, PUBLIC_SECTOR: 30 };
const PAID_RATE_PAST_DUE: Record<CustomerType, number> = { INDIVIDUAL: 0.93, SMALL_BUSINESS: 0.9, MEDIUM_BUSINESS: 0.88, ENTERPRISE: 0.85, PUBLIC_SECTOR: 0.78 };

export function generateScaleDataset(catalog: Catalog, opts: { seed?: number; asOf?: string } = {}): ScaleDataset {
  const seed = opts.seed ?? DEMO_SEED;
  const asOf = opts.asOf ?? DEMO_AS_OF;
  const r = makeRng(seed);
  const earliest = '2024-10-01';

  /* ---- customers & organizations ---- */
  const typeList: CustomerType[] = [];
  (Object.keys(SEGMENT_COUNTS) as CustomerType[]).forEach((t) => {
    for (let i = 0; i < SEGMENT_COUNTS[t]; i++) typeList.push(t);
  });
  const types = shuffle(r, typeList);

  const usedNames = new Set<string>();
  const organizations: OrgRow[] = [];
  const customers: CustomerRow[] = [];
  let orgSeq = 0;
  let publicSeq = 0;
  const span = diffDays(earliest, asOf) - 10;

  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const id = `cust-demo-${pad(i + 1, 5)}`;
    const city = weighted(r, CITIES, CITY_WEIGHTS);
    const createdAt = addDays(earliest, Math.floor(Math.pow(r(), 0.65) * span));
    const status: 'ACTIVE' | 'INACTIVE' = r() < (type === 'INDIVIDUAL' ? 0.86 : type === 'PUBLIC_SECTOR' ? 0.95 : 0.9) ? 'ACTIVE' : 'INACTIVE';

    let displayName = '';
    let displayAr = '';
    let businessName: string | null = null;
    let linkedOrganizationId: string | null = null;
    let nameForEmail = '';

    if (type === 'INDIVIDUAL') {
      for (let attempt = 0; ; attempt++) {
        const female = r() < 0.4;
        const [fe, fa] = pick(r, female ? FEMALE : MALE);
        const [le, la] = pick(r, FAMILY);
        const mid = attempt > 20 ? ` ${String.fromCharCode(65 + int(r, 0, 25))}.` : '';
        const en = `${fe}${mid} ${le}`;
        if (!usedNames.has(en)) {
          usedNames.add(en);
          displayName = en;
          displayAr = `${fa} ${la}`;
          nameForEmail = en;
          break;
        }
      }
    } else if (type === 'PUBLIC_SECTOR') {
      const dep = PUBLIC_DEPARTMENTS[publicSeq % PUBLIC_DEPARTMENTS.length];
      const pc = CITIES[(publicSeq + Math.floor(publicSeq / PUBLIC_DEPARTMENTS.length)) % CITIES.length];
      publicSeq++;
      displayName = `Demo ${dep.en} - ${pc} (Fictional)`;
      displayAr = `${dep.ar} التجريبي - ${CITY_AR[pc]} (وهمي)`;
      businessName = displayName;
      nameForEmail = `demo ${dep.en} ${pc}`;
      // The organization row carries the real linkage; city follows the department's city.
      const orgId = `org-demo-${pad(++orgSeq, 4)}`;
      organizations.push({ id: orgId, name: displayName, kind: 'EXTERNAL', industry: dep.industry, city: pc, country: 'Libya', email: `office.${slug(nameForEmail)}@example.com`, status, createdAt });
      linkedOrganizationId = orgId;
      customers.push(buildCustomer(id, type, displayName, displayAr, businessName, linkedOrganizationId, nameForEmail, pc, status, createdAt, i));
      continue;
    } else {
      const suffixes = BIZ_SUFFIX[type];
      for (let attempt = 0; ; attempt++) {
        const [pe, pa] = pick(r, BIZ_PREFIX);
        const sector = pick(r, SECTORS);
        const si = int(r, 0, suffixes.en.length - 1);
        const extra = attempt > 30 ? ` ${CITIES[attempt % CITIES.length]}` : '';
        const en = `${pe} ${sector.en} ${suffixes.en[si]}${extra}`;
        if (!usedNames.has(en)) {
          usedNames.add(en);
          displayName = en;
          businessName = en;
          displayAr = `${suffixes.ar[si]} ${pa} ${sector.ar}`;
          nameForEmail = en;
          if (type !== 'SMALL_BUSINESS') {
            const orgId = `org-demo-${pad(++orgSeq, 4)}`;
            organizations.push({ id: orgId, name: en, kind: 'EXTERNAL', industry: sector.industry, city, country: 'Libya', email: `contact.${slug(en)}@example.com`, status, createdAt });
            linkedOrganizationId = orgId;
          }
          break;
        }
      }
    }
    customers.push(buildCustomer(id, type, displayName, displayAr, businessName, linkedOrganizationId, nameForEmail, city, status, createdAt, i));
  }

  /* ---- subscriptions ---- */
  const plansByCur: Record<Cur, CatalogPlan[]> = { LYD: [], USD: [] };
  for (const p of catalog.plans) plansByCur[p.currency].push(p);
  const tier = new Map<string, number>();
  (['LYD', 'USD'] as Cur[]).forEach((c) => {
    const sorted = [...plansByCur[c]].sort((a, b) => a.price - b.price);
    sorted.forEach((p, idx) => tier.set(p.id, sorted.length > 1 ? idx / (sorted.length - 1) : 0.5));
  });

  const subscriptions: SubscriptionRow[] = [];
  let subSeq = 0;
  const pausedAt = new Map<string, string>();
  for (const c of customers) {
    const cfg = SEGMENT_SUB_COUNTS[c.type];
    const n = weighted(r, cfg.n, cfg.w);
    for (let k = 0; k < n; k++) {
      const usdBias = c.type === 'INDIVIDUAL' || c.type === 'SMALL_BUSINESS' ? 0.35 : c.type === 'PUBLIC_SECTOR' ? 0.1 : 0.55;
      const plan = weighted(
        r,
        catalog.plans,
        catalog.plans.map((p) => {
          const tr = tier.get(p.id) ?? 0.5;
          const priceW = c.type === 'INDIVIDUAL' ? 1.3 - tr : c.type === 'SMALL_BUSINESS' ? 1.1 - tr * 0.4 : 0.35 + tr;
          return Math.max(0.05, priceW) * (p.currency === 'USD' ? usdBias : 1);
        })
      );
      const [u0, u1] = UNITS[c.type];
      const units = int(r, u0, u1);
      const created = c.createdAt;
      const maxStart = addDays(asOf, -2);
      const startSpan = Math.max(0, diffDays(created, maxStart));
      let startDate = addDays(created, Math.floor(r() * (startSpan + 1)));

      let status: SubStatus;
      if (c.status === 'INACTIVE') status = r() < 0.6 ? 'CANCELED' : 'EXPIRED';
      else status = weighted(r, ['ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED', 'TRIAL'] as SubStatus[], [76, 7, 4, 7, 3, plan.trialDays > 0 ? 3 : 0]);
      if (status === 'TRIAL') startDate = addDays(asOf, -int(r, 1, Math.max(1, plan.trialDays - 1)));
      let canceledDate: string | null = null;
      if (status === 'CANCELED' || status === 'EXPIRED') {
        const room = diffDays(startDate, asOf) - 5;
        if (room < 10) status = 'ACTIVE';
        else canceledDate = addDays(startDate, int(r, 8, room));
      }
      let nextRenewal: string | null = null;
      if (status !== 'CANCELED' && status !== 'EXPIRED') {
        let k2 = 0;
        let cand = step(startDate, plan.interval, 0);
        while (cand < asOf && k2 < 400) {
          k2++;
          cand = step(startDate, plan.interval, k2);
        }
        nextRenewal = status === 'PAST_DUE' ? step(startDate, plan.interval, Math.max(0, k2 - 1)) : cand;
        if (status === 'TRIAL') nextRenewal = addDays(startDate, plan.trialDays);
      }
      const id = `sub-demo-${pad(++subSeq, 5)}`;
      if (status === 'PAUSED') pausedAt.set(id, addDays(asOf, -int(r, 3, 40)));
      subscriptions.push({
        id,
        organizationId: TENANT_ORG_ID,
        customerId: c.id,
        planId: plan.id,
        status,
        startDate,
        nextRenewal,
        canceledDate,
        price: round2(plan.price * units),
        currency: plan.currency,
        interval: plan.interval.toUpperCase() as SubscriptionRow['interval'],
      });
    }
  }

  /* ---- invoices & simulated payments ---- */
  const custById = new Map(customers.map((c) => [c.id, c]));
  const planById = new Map(catalog.plans.map((p) => [p.id, p]));
  type Draft = { sub: SubscriptionRow; issueDate: string };
  const drafts: Draft[] = [];
  for (const s of subscriptions) {
    if (s.status === 'TRIAL') continue;
    const plan = planById.get(s.planId)!;
    const end = s.canceledDate ?? (s.status === 'PAUSED' ? pausedAt.get(s.id)! : asOf);
    for (let k = 0; k < 600; k++) {
      const issue = step(s.startDate, plan.interval, k);
      if (issue > asOf || issue >= end) break;
      if (issue >= BILLING_WINDOW_START) drafts.push({ sub: s, issueDate: issue });
    }
  }
  drafts.sort((a, b) => (a.issueDate === b.issueDate ? a.sub.id.localeCompare(b.sub.id) : a.issueDate < b.issueDate ? -1 : 1));

  const invoices: InvoiceRow[] = [];
  const payments: PaymentRow[] = [];
  let paySeq = 0;
  const methodFor = () => weighted(r, PAYMENT_METHODS, PAYMENT_METHODS.map((m) => m.w));
  const pushPayment = (inv: InvoiceRow, date: string, status: PaymentRow['status'], method: string) => {
    payments.push({ id: `pay-demo-${pad(++paySeq, 6)}`, organizationId: TENANT_ORG_ID, invoiceId: inv.id, customerId: inv.customerId, date, amount: inv.total, currency: inv.currency, method, status });
  };

  drafts.forEach((d, idx) => {
    const cust = custById.get(d.sub.customerId)!;
    const seq = idx + 1;
    const due = addDays(d.issueDate, DUE_DAYS[cust.type]);
    const inv: InvoiceRow = {
      id: `inv-demo-${pad(seq, 6)}`,
      organizationId: TENANT_ORG_ID,
      number: `INV-D-${d.issueDate.slice(0, 4)}-${pad(seq, 6)}`,
      customerId: cust.id,
      subscriptionId: d.sub.id,
      currency: d.sub.currency,
      total: d.sub.price,
      issueDate: d.issueDate,
      dueDate: due,
      paidDate: null,
      status: 'ISSUED',
      note: 'Synthetic demo invoice',
    };
    const pastDue = due < asOf;
    const method = methodFor();

    if (r() < 0.012) {
      inv.status = 'VOID';
      invoices.push(inv);
      return;
    }
    const willPay = pastDue ? r() < PAID_RATE_PAST_DUE[cust.type] : r() < 0.45;
    const hadFailure = r() < 0.045 && diffDays(d.issueDate, asOf) >= 3;
    if (hadFailure) pushPayment(inv, addDays(d.issueDate, 2), 'FAILED', method.label);

    if (willPay && (!hadFailure || r() < 0.65)) {
      const earliestPay = addDays(d.issueDate, hadFailure ? 4 : 0);
      const maxPay = diffDays(d.issueDate, asOf);
      const offset = Math.min(maxPay, hadFailure ? diffDays(d.issueDate, earliestPay) + int(r, 0, 8) : pastDue ? int(r, 1, DUE_DAYS[cust.type] + 12) : int(r, 0, 5));
      const payDate = addDays(d.issueDate, Math.max(offset, hadFailure ? 4 : 0));
      if (payDate <= asOf) {
        pushPayment(inv, payDate, 'SUCCEEDED', method.label);
        inv.status = 'PAID';
        inv.paidDate = payDate;
      }
    }
    if (inv.status === 'ISSUED' && !hadFailure && r() < 0.04) {
      const attempted = addDays(asOf, -int(r, 0, 2));
      pushPayment(inv, attempted < d.issueDate ? d.issueDate : attempted, 'PENDING', method.label);
    }
    invoices.push(inv);
  });

  /* ---- financial transactions: one income row per successful payment, plus operating expenses ---- */
  const subById = new Map(subscriptions.map((s) => [s.id, s]));
  const invById = new Map(invoices.map((i) => [i.id, i]));
  const transactions: TransactionRow[] = [];
  const accountFor = (cur: Cur, pm: TransactionRow['paymentMethod']) =>
    cur === 'LYD' ? (pm === 'CASH' ? 'acc-lyd-cash-main' : 'acc-lyd-bank-main') : pm === 'LOCAL_CARD' ? 'acc-usd-card-processor' : 'acc-usd-bank-main';
  const collectedByMonth = new Map<string, number>();

  for (const p of payments) {
    if (p.status !== 'SUCCEEDED') continue;
    const inv = invById.get(p.invoiceId)!;
    const sub = subById.get(inv.subscriptionId)!;
    const plan = planById.get(sub.planId)!;
    const methodDef = PAYMENT_METHODS.find((m) => m.label === p.method) ?? PAYMENT_METHODS[0];
    // USD card payments run through the international processor.
    const pm = methodDef.pm === 'LOCAL_CARD' && p.currency === 'USD' ? 'INTERNATIONAL_CARD' : methodDef.pm;
    transactions.push({
      id: `txn-demo-in-${p.id.slice('pay-demo-'.length)}`,
      organizationId: TENANT_ORG_ID,
      description: `Subscription payment ${inv.number} (simulated)`,
      descriptionAr: `دفعة اشتراك ${inv.number} (محاكاة)`,
      amount: p.amount,
      currency: p.currency,
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيلات العملاء',
      transactionDate: p.date,
      dueDate: null,
      reference: inv.number,
      platformId: PRODUCT_PLATFORM[plan.productId] ?? 'plat-corporate',
      paymentMethod: pm as TransactionRow['paymentMethod'],
      accountId: accountFor(p.currency, pm === 'INTERNATIONAL_CARD' ? 'LOCAL_CARD' : pm),
    });
    const k = `${p.date.slice(0, 7)}|${p.currency}`;
    collectedByMonth.set(k, (collectedByMonth.get(k) ?? 0) + p.amount);
  }

  const months: string[] = [];
  for (let m = monthStart(BILLING_WINDOW_START); m <= monthStart(asOf); m = addMonths(m, 1)) months.push(m.slice(0, 7));
  const budgets: BudgetRow[] = [];
  let expSeq = 0;
  for (const cur of ['LYD', 'USD'] as Cur[]) {
    const completed = months.filter((m) => m < asOf.slice(0, 7)).map((m) => collectedByMonth.get(`${m}|${cur}`) ?? 0);
    const baseline = completed.length ? completed.reduce((a, b) => a + b, 0) / completed.length : 0;
    for (const m of months) {
      const isCurrent = m === asOf.slice(0, 7);
      const collected = isCurrent ? baseline : collectedByMonth.get(`${m}|${cur}`) ?? 0;
      const monthlyExpense = collected * (0.58 + r() * 0.12);
      const first = `${m}-01`;
      const last = endOfMonth(first);
      budgets.push({ organizationId: TENANT_ORG_ID, month: first, currency: cur, amount: Math.ceil((monthlyExpense * 1.12) / 1000) * 1000 });
      for (const cat of EXPENSE_CATEGORIES) {
        const catTotal = monthlyExpense * cat.share;
        const n = Math.max(2, Math.round((cat.share * (cur === 'LYD' ? 520 : 220)) / 3));
        const weights = Array.from({ length: n }, () => 0.4 + r() * 1.2);
        const wsum = weights.reduce((a, b) => a + b, 0);
        for (let j = 0; j < n; j++) {
          const day = int(r, cat.days[0], Math.min(cat.days[1], Number(last.slice(8))));
          const date = `${m}-${pad(day, 2)}`;
          const future = date > asOf;
          const status: TransactionRow['status'] = future ? (r() < 0.8 ? 'UPCOMING' : 'PENDING') : r() < 0.03 ? 'PENDING' : 'PAID';
          const pm = weighted(r, ['BANK_TRANSFER', 'CASH', 'LOCAL_CARD', 'DIGITAL_WALLET'] as const, cur === 'USD' ? [60, 0, 25, 15] : [55, 25, 10, 10]);
          const amount = round2((catTotal * weights[j]) / wsum);
          expSeq++;
          transactions.push({
            id: `txn-demo-ex-${pad(expSeq, 6)}`,
            organizationId: TENANT_ORG_ID,
            description: `${cat.descEn} - ${m} (demo)`,
            descriptionAr: `${cat.descAr} - ${m} (تجريبي)`,
            amount,
            currency: cur,
            type: 'EXPENSE',
            status,
            category: cat.en,
            categoryAr: cat.ar,
            transactionDate: date,
            dueDate: status === 'PAID' ? null : date,
            reference: `EXP-D-${pad(expSeq, 6)}`,
            platformId: pick(r, PLATFORM_IDS),
            paymentMethod: pm,
            accountId: accountFor(cur, pm === 'LOCAL_CARD' ? 'LOCAL_CARD' : pm),
          });
        }
      }
    }
  }

  return { seed, asOf, organizations, customers, subscriptions, invoices, payments, transactions, budgets };
}

function buildCustomer(
  id: string,
  type: CustomerType,
  displayName: string,
  displayAr: string,
  businessName: string | null,
  linkedOrganizationId: string | null,
  nameForEmail: string,
  city: string,
  status: 'ACTIVE' | 'INACTIVE',
  createdAt: string,
  index: number
): CustomerRow {
  const prefixes = ['91', '92', '94', '93'];
  return {
    id,
    organizationId: TENANT_ORG_ID,
    type,
    displayName,
    businessName,
    linkedOrganizationId,
    email: `${slug(nameForEmail).slice(0, 40)}.${pad(index + 1, 5)}@example.com`,
    // +218 9x 000 NNNN: a block that is deliberately never a real subscriber number.
    phone: `+218 ${prefixes[index % prefixes.length]} 000 ${pad(index % 10000, 4)}`,
    city,
    country: 'Libya',
    status,
    // Two lines: the English label and the Arabic name never share a line, so neither can scramble the other's direction.
    notes: `Synthetic demo record - fictional.\nالاسم بالعربية: ${displayAr}`,
    createdAt,
  };
}

/* ------------------------------------------------------------------ validation */

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  counts: Record<string, number>;
  segments: Record<CustomerType, number>;
  byCity: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  invoicesByStatus: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  money: Record<Cur, { invoiced: number; collected: number; outstanding: number; incomeTransactions: number; expenseTransactions: number }>;
}

export function validateScaleDataset(ds: ScaleDataset, catalog: Catalog): ValidationReport {
  const errors: string[] = [];
  const err = (m: string) => {
    if (errors.length < 50) errors.push(m);
  };
  const dup = (label: string, vals: string[]) => {
    const seen = new Set<string>();
    for (const v of vals) {
      if (seen.has(v)) err(`duplicate ${label}: ${v}`);
      seen.add(v);
    }
  };

  const segments = { INDIVIDUAL: 0, SMALL_BUSINESS: 0, MEDIUM_BUSINESS: 0, ENTERPRISE: 0, PUBLIC_SECTOR: 0 } as Record<CustomerType, number>;
  const byCity: Record<string, number> = {};
  for (const c of ds.customers) {
    segments[c.type]++;
    byCity[c.city] = (byCity[c.city] ?? 0) + 1;
  }
  if (ds.customers.length !== TOTAL_CUSTOMERS) err(`customer count ${ds.customers.length} != ${TOTAL_CUSTOMERS}`);
  for (const t of Object.keys(SEGMENT_COUNTS) as CustomerType[]) if (segments[t] !== SEGMENT_COUNTS[t]) err(`segment ${t}: ${segments[t]} != ${SEGMENT_COUNTS[t]}`);
  for (const city of Object.keys(byCity)) if (!(CITIES as readonly string[]).includes(city)) err(`unexpected city ${city}`);

  dup('customer id', ds.customers.map((c) => c.id));
  dup('customer email', ds.customers.map((c) => c.email));
  dup('customer name', ds.customers.map((c) => c.displayName));
  dup('organization id', ds.organizations.map((o) => o.id));
  dup('subscription id', ds.subscriptions.map((s) => s.id));
  dup('invoice id', ds.invoices.map((i) => i.id));
  dup('invoice number', ds.invoices.map((i) => i.number));
  dup('payment id', ds.payments.map((p) => p.id));
  dup('transaction id', ds.transactions.map((t) => t.id));
  dup('budget key', ds.budgets.map((b) => `${b.month}|${b.currency}`));

  for (const c of ds.customers) {
    if (!c.email.endsWith('@example.com')) err(`non-reserved email domain: ${c.id}`);
    if (!c.notes.includes('Synthetic')) err(`customer ${c.id} not labelled synthetic`);
    if (c.type === 'PUBLIC_SECTOR' && !c.displayName.includes('(Fictional)')) err(`public-sector ${c.id} not labelled fictional`);
  }

  const custIds = new Set(ds.customers.map((c) => c.id));
  const orgIds = new Set(ds.organizations.map((o) => o.id));
  const planById = new Map(catalog.plans.map((p) => [p.id, p]));
  for (const c of ds.customers) if (c.linkedOrganizationId && !orgIds.has(c.linkedOrganizationId)) err(`customer ${c.id} links missing org`);
  const subById = new Map<string, SubscriptionRow>();
  for (const s of ds.subscriptions) {
    subById.set(s.id, s);
    if (!custIds.has(s.customerId)) err(`subscription ${s.id}: missing customer`);
    const p = planById.get(s.planId);
    if (!p) err(`subscription ${s.id}: missing plan`);
    else if (p.currency !== s.currency) err(`subscription ${s.id}: currency differs from plan`);
    if (s.price <= 0) err(`subscription ${s.id}: non-positive price`);
    if ((s.status === 'CANCELED' || s.status === 'EXPIRED') !== (s.canceledDate !== null)) err(`subscription ${s.id}: canceledDate/status mismatch`);
    if (s.canceledDate && s.canceledDate <= s.startDate) err(`subscription ${s.id}: canceled before start`);
  }

  const invById = new Map<string, InvoiceRow>();
  for (const i of ds.invoices) {
    invById.set(i.id, i);
    const s = subById.get(i.subscriptionId);
    if (!s) err(`invoice ${i.id}: missing subscription`);
    else {
      if (s.customerId !== i.customerId) err(`invoice ${i.id}: customer differs from subscription`);
      if (s.currency !== i.currency) err(`invoice ${i.id}: currency differs from subscription`);
      if (s.price !== i.total) err(`invoice ${i.id}: total differs from subscription price`);
    }
    if (i.dueDate < i.issueDate) err(`invoice ${i.id}: due before issue`);
    if (i.issueDate > ds.asOf) err(`invoice ${i.id}: issued in the future`);
  }

  const succeededByInvoice = new Map<string, PaymentRow[]>();
  for (const p of ds.payments) {
    const inv = invById.get(p.invoiceId);
    if (!inv) {
      err(`payment ${p.id}: missing invoice`);
      continue;
    }
    if (inv.customerId !== p.customerId) err(`payment ${p.id}: customer differs from invoice`);
    if (inv.currency !== p.currency) err(`payment ${p.id}: currency differs from invoice`);
    if (p.amount !== inv.total) err(`payment ${p.id}: amount differs from invoice total`);
    if (p.date < inv.issueDate || p.date > ds.asOf) err(`payment ${p.id}: date out of range`);
    if (p.status === 'SUCCEEDED') succeededByInvoice.set(p.invoiceId, [...(succeededByInvoice.get(p.invoiceId) ?? []), p]);
  }
  const money: ValidationReport['money'] = {
    LYD: { invoiced: 0, collected: 0, outstanding: 0, incomeTransactions: 0, expenseTransactions: 0 },
    USD: { invoiced: 0, collected: 0, outstanding: 0, incomeTransactions: 0, expenseTransactions: 0 },
  };
  for (const i of ds.invoices) {
    const ok = succeededByInvoice.get(i.id) ?? [];
    const paidSum = round2(ok.reduce((a, p) => a + p.amount, 0));
    if (i.status === 'PAID') {
      if (ok.length !== 1) err(`invoice ${i.id}: PAID with ${ok.length} successful payments`);
      else if (paidSum !== i.total) err(`invoice ${i.id}: paid sum != total`);
      if (!i.paidDate || (ok[0] && ok[0].date !== i.paidDate)) err(`invoice ${i.id}: paidDate mismatch`);
    } else {
      if (ok.length > 0) err(`invoice ${i.id}: ${i.status} but has a successful payment`);
      if (i.paidDate) err(`invoice ${i.id}: ${i.status} with paidDate`);
    }
    if (i.status !== 'VOID') {
      money[i.currency].invoiced = round2(money[i.currency].invoiced + i.total);
      if (i.status === 'PAID') money[i.currency].collected = round2(money[i.currency].collected + i.total);
      else money[i.currency].outstanding = round2(money[i.currency].outstanding + i.total);
    }
  }

  const payById = new Map(ds.payments.map((p) => [p.id, p]));
  let incomeTx = 0;
  for (const t of ds.transactions) {
    if (t.currency !== 'LYD' && t.currency !== 'USD') err(`transaction ${t.id}: bad currency`);
    if (t.amount <= 0) err(`transaction ${t.id}: non-positive amount`);
    if (!PLATFORM_IDS.includes(t.platformId)) err(`transaction ${t.id}: unknown platform`);
    if (t.currency === 'LYD' && t.accountId.includes('usd')) err(`transaction ${t.id}: LYD on a USD account`);
    if (t.currency === 'USD' && t.accountId.includes('lyd')) err(`transaction ${t.id}: USD on a LYD account`);
    if (t.type === 'INCOME') {
      incomeTx++;
      money[t.currency].incomeTransactions++;
      const pay = payById.get(`pay-demo-${t.id.slice('txn-demo-in-'.length)}`);
      if (!pay || pay.status !== 'SUCCEEDED') err(`income ${t.id}: no matching successful payment`);
      else if (pay.amount !== t.amount || pay.currency !== t.currency || pay.date !== t.transactionDate) err(`income ${t.id}: differs from payment`);
    } else money[t.currency].expenseTransactions++;
  }
  const succeeded = ds.payments.filter((p) => p.status === 'SUCCEEDED').length;
  if (incomeTx !== succeeded) err(`income transactions ${incomeTx} != successful payments ${succeeded}`);

  const tally = <T,>(rows: T[], key: (x: T) => string) => rows.reduce<Record<string, number>>((m, x) => ((m[key(x)] = (m[key(x)] ?? 0) + 1), m), {});
  const counts = {
    customers: ds.customers.length,
    organizations: ds.organizations.length,
    subscriptions: ds.subscriptions.length,
    invoices: ds.invoices.length,
    payments: ds.payments.length,
    transactions: ds.transactions.length,
    budgets: ds.budgets.length,
  };
  // Target ranges from the brief (these cover the generated rows; the seeded demo rows add a few dozen on top).
  const range = (label: string, n: number, lo: number, hi: number) => {
    if (n < lo || n > hi) err(`${label} ${n} outside ${lo}-${hi}`);
  };
  range('subscriptions', counts.subscriptions, 1500, 2480);
  range('invoices', counts.invoices, 3000, 5950);
  range('payments', counts.payments, 2000, 4950);
  range('transactions', counts.transactions, 3000, 7950);

  return {
    ok: errors.length === 0,
    errors,
    counts,
    segments,
    byCity,
    subscriptionsByStatus: tally(ds.subscriptions, (s) => s.status),
    invoicesByStatus: tally(ds.invoices, (i) => i.status),
    paymentsByStatus: tally(ds.payments, (p) => p.status),
    money,
  };
}
