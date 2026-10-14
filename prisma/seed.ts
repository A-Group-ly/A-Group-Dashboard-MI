import { PrismaClient } from '@prisma/client';
import {
  CUSTOMERS,
  INVOICES,
  ORGS,
  PAYMENTS,
  PLANS,
  PRODUCTS,
  SUBSCRIPTIONS,
} from '../src/lib/subscriptionDemo';

// Safety: this script writes FICTIONAL demo data. Refuse to run against production unless explicitly allowed.
if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
  console.error('Refusing to seed: NODE_ENV=production and ALLOW_PRODUCTION_SEED is not "true".');
  process.exit(1);
}

const prisma = new PrismaClient();

/** The tenant that owns all demo business data. */
const ORG_ID = 'org-a-group-holding';

const upper = (v: string) => v.toUpperCase();

async function seedSubscriptionDomain() {
  // Customer-side organizations (listed on the Organizations page).
  for (const o of ORGS) {
    await prisma.organization.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        name: o.name,
        kind: upper(o.kind) as 'INTERNAL' | 'EXTERNAL',
        industry: o.industry,
        city: o.city,
        country: o.country,
        email: o.email,
        status: upper(o.status) as 'ACTIVE' | 'INACTIVE',
        createdAt: new Date(o.createdAt),
      },
    });
  }

  for (const c of CUSTOMERS) {
    await prisma.customer.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        organizationId: ORG_ID,
        type: upper(c.type) as never,
        displayName: c.displayName,
        businessName: c.businessName,
        linkedOrganizationId: c.orgId,
        email: c.email,
        phone: c.phone,
        city: c.city,
        country: c.country,
        status: upper(c.status) as 'ACTIVE' | 'INACTIVE',
        notes: c.notes,
        createdAt: new Date(c.createdAt),
      },
    });
  }

  for (const p of PRODUCTS) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, organizationId: ORG_ID, name: p.name, category: p.category, description: p.description },
    });
  }

  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        organizationId: ORG_ID,
        productId: p.productId,
        name: p.name,
        interval: upper(p.interval) as never,
        price: p.price,
        currency: p.currency,
        trialDays: p.trialDays,
      },
    });
  }

  for (const s of SUBSCRIPTIONS) {
    const plan = PLANS.find((p) => p.id === s.planId)!;
    await prisma.subscription.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        organizationId: ORG_ID,
        customerId: s.customerId,
        planId: s.planId,
        status: upper(s.status) as never,
        startDate: new Date(s.startDate),
        nextRenewal: s.nextRenewal ? new Date(s.nextRenewal) : null,
        canceledDate: s.canceledDate ? new Date(s.canceledDate) : null,
        // commercial terms are snapshotted on the subscription
        price: plan.price,
        currency: plan.currency,
        interval: upper(plan.interval) as never,
      },
    });
  }

  for (const i of INVOICES) {
    await prisma.invoice.upsert({
      where: { id: i.id },
      update: {},
      create: {
        id: i.id,
        organizationId: ORG_ID,
        number: i.number,
        customerId: i.customerId,
        subscriptionId: i.subscriptionId,
        currency: i.currency,
        total: i.total,
        issueDate: new Date(i.issueDate),
        dueDate: new Date(i.dueDate),
        paidDate: i.paidDate ? new Date(i.paidDate) : null,
        // "overdue" is derived at query time, so it is stored as ISSUED
        status: (i.status === 'overdue' ? 'ISSUED' : upper(i.status)) as never,
        note: i.note,
      },
    });
  }

  for (const p of PAYMENTS) {
    await prisma.billingPayment.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        organizationId: ORG_ID,
        invoiceId: p.invoiceId,
        customerId: p.customerId,
        date: new Date(p.date),
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: upper(p.status) as never,
      },
    });
  }

  console.log('✅ Customers, catalog, subscriptions, invoices and simulated payments created');
  await seedRecentBilling();
}

/**
 * Recent (Sep / Oct 2026) fictional billing so "total paid", "outstanding" and "expected by month end"
 * have realistic content around the demo date. Deterministic ids, idempotent.
 * [subscriptionId, month, amount, issue, due, paidDate | null]
 */
async function seedRecentBilling() {
  const rows: [string, string, number, string, string, string | null][] = [
    ['sub_001', 'sep', 950, '2026-09-01', '2026-09-15', '2026-09-05'],
    ['sub_002', 'sep', 2200, '2026-09-01', '2026-09-15', '2026-09-09'],
    ['sub_005', 'sep', 600, '2026-09-01', '2026-09-15', '2026-09-07'],
    ['sub_006', 'sep', 450, '2026-09-01', '2026-09-15', '2026-09-10'],
    ['sub_007', 'sep', 1400, '2026-09-01', '2026-09-15', '2026-09-04'],
    ['sub_009', 'sep', 199, '2026-09-01', '2026-09-15', '2026-09-08'],
    ['sub_010', 'sep', 24, '2026-09-01', '2026-09-15', '2026-09-06'],
    ['sub_013', 'sep', 9, '2026-09-01', '2026-09-15', '2026-09-11'],
    ['sub_001', 'oct', 950, '2026-10-01', '2026-10-15', '2026-10-03'],
    ['sub_005', 'oct', 600, '2026-10-01', '2026-10-15', '2026-10-06'],
    ['sub_007', 'oct', 1400, '2026-10-01', '2026-10-15', '2026-10-02'],
    ['sub_010', 'oct', 24, '2026-10-01', '2026-10-15', '2026-10-04'],
    ['sub_013', 'oct', 9, '2026-10-01', '2026-10-15', '2026-10-09'],
    // still open: due today / later this month
    ['sub_006', 'oct', 450, '2026-10-01', '2026-10-15', null],
    ['sub_002', 'oct', 2200, '2026-10-10', '2026-10-25', null],
    ['sub_009', 'oct', 199, '2026-10-12', '2026-10-29', null],
  ];

  let n = 100;
  for (const [subId, month, amount, issue, due, paid] of rows) {
    n += 1;
    const sub = SUBSCRIPTIONS.find((s) => s.id === subId)!;
    const plan = PLANS.find((p) => p.id === sub.planId)!;
    const id = `inv_recent_${month}_${subId}`;
    await prisma.invoice.upsert({
      where: { id },
      update: {},
      create: {
        id,
        organizationId: ORG_ID,
        number: `INV-2026-0${n}`,
        customerId: sub.customerId,
        subscriptionId: subId,
        currency: plan.currency,
        total: amount,
        issueDate: new Date(issue),
        dueDate: new Date(due),
        paidDate: paid ? new Date(paid) : null,
        status: paid ? 'PAID' : 'ISSUED',
      },
    });
    if (paid) {
      await prisma.billingPayment.upsert({
        where: { id: `pay_${id}` },
        update: {},
        create: {
          id: `pay_${id}`,
          organizationId: ORG_ID,
          invoiceId: id,
          customerId: sub.customerId,
          date: new Date(paid),
          amount,
          currency: plan.currency,
          method: n % 2 ? 'Bank transfer (simulated)' : 'Card on file (simulated)',
          status: 'SUCCEEDED',
        },
      });
    }
  }
  console.log('✅ Recent (Sep/Oct 2026) simulated billing created');
}

async function main() {
  console.log('🌱 Starting database seed (fictional demo data)...');

  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'A-Group Holding',
      kind: 'INTERNAL',
      industry: 'Holding company',
      city: 'Tripoli',
      country: 'Libya',
      email: 'hq@agroup.example',
    },
  });
  console.log('✅ Tenant organization ready');

  const platformDefs = [
    { id: 'plat-a-stay', code: 'A-STAY', name: 'A-Stay Bookings' },
    { id: 'plat-a-market', code: 'A-MARKET', name: 'A-Market Wholesale' },
    { id: 'plat-a-space', code: 'A-SPACE', name: 'A-Space Offices' },
    { id: 'plat-corporate', code: 'CORPORATE', name: 'Corporate' },
    { id: 'plat-tech-infra', code: 'TECH-INFRA', name: 'Tech Infrastructure' },
  ];
  const platforms = await Promise.all(
    platformDefs.map((d) =>
      prisma.platform.upsert({
        where: { organizationId_code: { organizationId: ORG_ID, code: d.code } },
        update: {},
        create: { id: d.id, organizationId: ORG_ID, name: d.name, code: d.code, active: true },
      })
    )
  );
  const [astay, amarket, aspace, corporate, techInfra] = platforms;
  console.log('✅ Platforms created');

  const accountDefs = [
    { id: 'acc-lyd-cash-main', name: 'Main Cash Register (LYD)', type: 'CASH_REGISTER', currency: 'LYD' },
    { id: 'acc-lyd-bank-main', name: 'Main Bank Account (LYD)', type: 'BANK_ACCOUNT', currency: 'LYD' },
    { id: 'acc-usd-bank-main', name: 'Main Bank Account (USD)', type: 'BANK_ACCOUNT', currency: 'USD' },
    { id: 'acc-usd-card-processor', name: 'International Card Processor (USD)', type: 'DIGITAL_WALLET', currency: 'USD' },
  ] as const;
  const accounts = await Promise.all(
    accountDefs.map((a) =>
      prisma.financialAccount.upsert({
        where: { id: a.id },
        update: {},
        create: { ...a, organizationId: ORG_ID, active: true },
      })
    )
  );
  const [lydCash, lydBank, usdBank, usdCardProcessor] = accounts;
  console.log('✅ Financial accounts created');

  for (const currency of ['LYD', 'USD'] as const) {
    await prisma.openingBalance.upsert({
      where: {
        organizationId_effectiveDate_currency: { organizationId: ORG_ID, effectiveDate: new Date('2026-09-01'), currency },
      },
      update: {},
      create: {
        organizationId: ORG_ID,
        effectiveDate: new Date('2026-09-01'),
        currency,
        amount: currency === 'LYD' ? 480000 : 45000,
        notes: 'ILLUSTRATIVE ONLY - Sample opening balance for demo purposes',
      },
    });
  }
  console.log('✅ Opening balances created');

  // Company-wide budgets (platformId NULL). Idempotent via find-then-create; the database also has a
  // partial unique index that rejects duplicates.
  for (const month of ['2026-09-01', '2026-10-01']) {
    for (const currency of ['LYD', 'USD'] as const) {
      const exists = await prisma.monthlyBudget.findFirst({
        where: { organizationId: ORG_ID, month: new Date(month), currency, platformId: null },
      });
      if (!exists) {
        await prisma.monthlyBudget.create({
          data: { organizationId: ORG_ID, month: new Date(month), currency, amount: currency === 'LYD' ? 180000 : 8500, platformId: null },
        });
      }
    }
  }
  console.log('✅ Monthly budgets created');

  // Helper to create transactions with payment methods
  const createTransaction = async (data: {
    description: string;
    descriptionAr?: string;
    amount: number;
    currency: 'LYD' | 'USD';
    type: 'INCOME' | 'EXPENSE';
    status: 'PAID' | 'PENDING' | 'UPCOMING';
    category: string;
    categoryAr?: string;
    platformId: string;
    transactionDate: Date;
    dueDate?: Date;
    reference?: string;
    paymentMethod?: 'CASH' | 'LOCAL_CARD' | 'INTERNATIONAL_CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET' | 'OTHER' | 'NOT_APPLICABLE';
    paymentProvider?: string;
    accountId?: string;
    externalReference?: string;
  }) => {
    return prisma.financialTransaction.upsert({
      where: {
        id: `seed-${data.platformId}-${data.category}-${data.transactionDate.toISOString().split('T')[0]}-${data.amount}`,
      },
      update: {},
      create: {
        id: `seed-${data.platformId}-${data.category}-${data.transactionDate.toISOString().split('T')[0]}-${data.amount}`,
        organizationId: ORG_ID,
        description: data.description,
        descriptionAr: data.descriptionAr,
        amount: data.amount,
        currency: data.currency,
        type: data.type,
        status: data.status,
        category: data.category,
        categoryAr: data.categoryAr,
        platformId: data.platformId,
        transactionDate: data.transactionDate,
        dueDate: data.dueDate,
        reference: data.reference,
        paymentMethod: data.paymentMethod || 'NOT_APPLICABLE',
        paymentProvider: data.paymentProvider,
        accountId: data.accountId,
        externalReference: data.externalReference,
      },
    });
  };

  // --- SEPTEMBER 2026 (LYD) ---
  await Promise.all([
    createTransaction({
      description: 'A-Stay September Bookings',
      descriptionAr: 'حجوزات شهر سبتمبر A-Stay',
      amount: 132000,
      currency: 'LYD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: astay.id,
      transactionDate: new Date('2026-09-15'),
      paymentMethod: 'BANK_TRANSFER',
      paymentProvider: 'Sadad/Tadawul',
      accountId: lydBank.id,
      externalReference: 'SADAD-SEP-001',
    }),
    createTransaction({
      description: 'A-Market September Subscriptions',
      descriptionAr: 'اشتراكات سبتمبر A-Market',
      amount: 54000,
      currency: 'LYD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: amarket.id,
      transactionDate: new Date('2026-09-10'),
      paymentMethod: 'LOCAL_CARD',
      paymentProvider: 'Local Payment Gateway',
      accountId: lydBank.id,
      externalReference: 'LOCAL-GW-SEP-002',
    }),
    createTransaction({
      description: 'A-Space September Memberships',
      descriptionAr: 'عضويات شهر سبتمبر A-Space',
      amount: 34000,
      currency: 'LYD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: aspace.id,
      transactionDate: new Date('2026-09-08'),
      paymentMethod: 'CASH',
      paymentProvider: 'Walk-in Payment',
      accountId: lydCash.id,
      externalReference: 'CASH-SEP-003',
    }),
    createTransaction({
      description: 'Tripoli Office Expenses (Sept)',
      descriptionAr: 'مصاريف مقر طرابلس لشهر سبتمبر',
      amount: 19500,
      currency: 'LYD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Office & Facilities',
      categoryAr: 'المقر والمرافق',
      platformId: corporate.id,
      transactionDate: new Date('2026-09-02'),
      paymentMethod: 'BANK_TRANSFER',
      paymentProvider: 'Bank Transfer',
      accountId: lydBank.id,
      externalReference: 'BANK-SEP-004',
    }),
    createTransaction({
      description: 'Salaries (Sept)',
      descriptionAr: 'المرتبات لشهر سبتمبر',
      amount: 70000,
      currency: 'LYD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Salaries & Contractors',
      categoryAr: 'المرتبات والمكافآت',
      platformId: corporate.id,
      transactionDate: new Date('2026-09-01'),
      paymentMethod: 'BANK_TRANSFER',
      paymentProvider: 'Payroll Bank Transfer',
      accountId: lydBank.id,
      externalReference: 'PAYROLL-SEP-005',
    }),
  ]);

  console.log('✅ September 2026 LYD transactions created');

  // --- OCTOBER 2026 (LYD) ---
  await Promise.all([
    createTransaction({
      description: 'A-Stay Guest Reservations (Sadad/Tadawul Inflows)',
      descriptionAr: 'حجوزات شاليهات واستراحات A-Stay (سداد/تداول)',
      amount: 148500,
      currency: 'LYD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: astay.id,
      transactionDate: new Date('2026-10-08'),
      paymentMethod: 'BANK_TRANSFER',
      paymentProvider: 'Sadad/Tadawul',
      accountId: lydBank.id,
      externalReference: 'SADAD-OCT-001',
    }),
    createTransaction({
      description: 'A-Market Wholesale Merchant Subscription Fees',
      descriptionAr: 'اشتراكات تجار الجملة والموردين - A-Market',
      amount: 62000,
      currency: 'LYD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: amarket.id,
      transactionDate: new Date('2026-10-05'),
      paymentMethod: 'LOCAL_CARD',
      paymentProvider: 'Local Payment Gateway',
      accountId: lydBank.id,
      externalReference: 'LOCAL-GW-OCT-002',
    }),
    createTransaction({
      description: 'A-Space Desk & Meeting Room Private Leases',
      descriptionAr: 'إيجارات مكاتب وقاعات اجتماعات A-Space',
      amount: 38400,
      currency: 'LYD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: aspace.id,
      transactionDate: new Date('2026-10-03'),
      paymentMethod: 'CASH',
      paymentProvider: 'Walk-in Payment',
      accountId: lydCash.id,
      externalReference: 'CASH-OCT-003',
    }),
    createTransaction({
      description: 'A-Group Tripoli HQ Lease & Utilities (Znata)',
      descriptionAr: 'إيجار المقر الرئيسي بطرابلس والخدمات (زناتة)',
      amount: 19500,
      currency: 'LYD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Office & Facilities',
      categoryAr: 'المقر والمرافق',
      platformId: corporate.id,
      transactionDate: new Date('2026-10-02'),
      paymentMethod: 'BANK_TRANSFER',
      paymentProvider: 'Bank Transfer',
      accountId: lydBank.id,
      externalReference: 'BANK-OCT-004',
    }),
    createTransaction({
      description: 'Core Operations Staff & Support Salaries',
      descriptionAr: 'مرتبات الكادر التشغيلي والدعم الفني المحلي',
      amount: 72000,
      currency: 'LYD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Salaries & Contractors',
      categoryAr: 'المرتبات والمكافآت',
      platformId: corporate.id,
      transactionDate: new Date('2026-10-01'),
      paymentMethod: 'BANK_TRANSFER',
      paymentProvider: 'Payroll Bank Transfer',
      accountId: lydBank.id,
      externalReference: 'PAYROLL-OCT-005',
    }),
    createTransaction({
      description: 'A-Stay Local Host Commissions Payout',
      descriptionAr: 'مستحقات أصحاب الشاليهات والمنتجعات',
      amount: 68000,
      currency: 'LYD',
      type: 'EXPENSE',
      status: 'UPCOMING',
      category: 'Merchant Payout',
      categoryAr: 'تسوية مستحقات الملاك',
      platformId: astay.id,
      transactionDate: new Date('2026-10-18'),
      dueDate: new Date('2026-10-18'),
      paymentMethod: 'BANK_TRANSFER',
      paymentProvider: 'Bank Transfer',
      accountId: lydBank.id,
      externalReference: 'PAYOUT-OCT-006',
    }),
  ]);

  console.log('✅ October 2026 LYD transactions created');

  // --- SEPTEMBER 2026 (USD) ---
  await Promise.all([
    createTransaction({
      description: 'International Partner Consultation',
      descriptionAr: 'استشارات تقنية دولية',
      amount: 9800,
      currency: 'USD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: corporate.id,
      transactionDate: new Date('2026-09-10'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'Stripe',
      accountId: usdCardProcessor.id,
      externalReference: 'STRIPE-SEP-001',
    }),
    createTransaction({
      description: 'AWS Cloud Infrastructure (Sept)',
      descriptionAr: 'خوادم أمازون لشهر سبتمبر',
      amount: 2200,
      currency: 'USD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Cloud & Tech Stack',
      categoryAr: 'البنية السحابية والبرمجيات',
      platformId: techInfra.id,
      transactionDate: new Date('2026-09-02'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'AWS Billing',
      accountId: usdCardProcessor.id,
      externalReference: 'AWS-SEP-002',
    }),
    createTransaction({
      description: 'Google Workspace (Sept)',
      descriptionAr: 'جوجل ووركسبيس لشهر سبتمبر',
      amount: 880,
      currency: 'USD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Cloud & Tech Stack',
      categoryAr: 'البنية السحابية والبرمجيات',
      platformId: techInfra.id,
      transactionDate: new Date('2026-09-04'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'Google Cloud Billing',
      accountId: usdCardProcessor.id,
      externalReference: 'GCP-SEP-003',
    }),
    createTransaction({
      description: 'Meta Ads (Sept)',
      descriptionAr: 'إعلانات ميتا لشهر سبتمبر',
      amount: 1500,
      currency: 'USD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Marketing & Ads',
      categoryAr: 'التسويق والإعلانات',
      platformId: astay.id,
      transactionDate: new Date('2026-09-12'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'Meta Ads Billing',
      accountId: usdCardProcessor.id,
      externalReference: 'META-SEP-004',
    }),
  ]);

  console.log('✅ September 2026 USD transactions created');

  // --- OCTOBER 2026 (USD) ---
  await Promise.all([
    createTransaction({
      description: 'International Partner Enterprise API Integration',
      descriptionAr: 'عقد تكامل واجهات برمجية لعميل دولي',
      amount: 12500,
      currency: 'USD',
      type: 'INCOME',
      status: 'PAID',
      category: 'Customer Collection',
      categoryAr: 'تحصيل من الزبائن',
      platformId: corporate.id,
      transactionDate: new Date('2026-10-06'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'Stripe',
      accountId: usdCardProcessor.id,
      externalReference: 'STRIPE-OCT-001',
    }),
    createTransaction({
      description: 'AWS Cloud Infrastructure (EC2, RDS, S3 Clusters)',
      descriptionAr: 'خوادم أمازون السحابية (AWS)',
      amount: 2450,
      currency: 'USD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Cloud & Tech Stack',
      categoryAr: 'البنية السحابية والبرمجيات',
      platformId: techInfra.id,
      transactionDate: new Date('2026-10-02'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'AWS Billing',
      accountId: usdCardProcessor.id,
      externalReference: 'AWS-OCT-002',
    }),
    createTransaction({
      description: 'Google Workspace & GCP Developer Licenses',
      descriptionAr: 'تراخيص جوجل ووركسبيس للموظفين',
      amount: 880,
      currency: 'USD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Cloud & Tech Stack',
      categoryAr: 'البنية السحابية والبرمجيات',
      platformId: techInfra.id,
      transactionDate: new Date('2026-10-04'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'Google Cloud Billing',
      accountId: usdCardProcessor.id,
      externalReference: 'GCP-OCT-003',
    }),
    createTransaction({
      description: 'GitHub Enterprise + Docker Registry',
      descriptionAr: 'اشتراك جيت هب للفرق البرمجية',
      amount: 420,
      currency: 'USD',
      type: 'EXPENSE',
      status: 'PAID',
      category: 'Cloud & Tech Stack',
      categoryAr: 'البنية السحابية والبرمجيات',
      platformId: techInfra.id,
      transactionDate: new Date('2026-10-05'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'GitHub Billing',
      accountId: usdCardProcessor.id,
      externalReference: 'GITHUB-OCT-004',
    }),
    createTransaction({
      description: 'Meta & Google Ads Campaign (A-Stay Launch)',
      descriptionAr: 'حملات إعلانية ممولة (إطلاق A-Stay)',
      amount: 1800,
      currency: 'USD',
      type: 'EXPENSE',
      status: 'UPCOMING',
      category: 'Marketing & Ads',
      categoryAr: 'التسويق والإعلانات',
      platformId: astay.id,
      transactionDate: new Date('2026-10-15'),
      dueDate: new Date('2026-10-15'),
      paymentMethod: 'INTERNATIONAL_CARD',
      paymentProvider: 'Meta/Google Ads Billing',
      accountId: usdCardProcessor.id,
      externalReference: 'ADS-OCT-005',
    }),
  ]);

  console.log('✅ October 2026 USD transactions created');
  await seedSubscriptionDomain();
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });