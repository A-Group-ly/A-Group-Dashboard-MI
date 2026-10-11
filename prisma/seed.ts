import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create platforms
  const platforms = await Promise.all([
    prisma.platform.upsert({
      where: { code: 'A-STAY' },
      update: {},
      create: {
        name: 'A-Stay Bookings',
        code: 'A-STAY',
        active: true,
      },
    }),
    prisma.platform.upsert({
      where: { code: 'A-MARKET' },
      update: {},
      create: {
        name: 'A-Market Wholesale',
        code: 'A-MARKET',
        active: true,
      },
    }),
    prisma.platform.upsert({
      where: { code: 'A-SPACE' },
      update: {},
      create: {
        name: 'A-Space Offices',
        code: 'A-SPACE',
        active: true,
      },
    }),
    prisma.platform.upsert({
      where: { code: 'CORPORATE' },
      update: {},
      create: {
        name: 'Corporate',
        code: 'CORPORATE',
        active: true,
      },
    }),
    prisma.platform.upsert({
      where: { code: 'TECH-INFRA' },
      update: {},
      create: {
        name: 'Tech Infrastructure',
        code: 'TECH-INFRA',
        active: true,
      },
    }),
  ]);

  const [astay, amarket, aspace, corporate, techInfra] = platforms;

  console.log('✅ Platforms created');

  // Create financial accounts (illustrative only)
  const accounts = await Promise.all([
    prisma.financialAccount.upsert({
      where: { id: 'acc-lyd-cash-main' },
      update: {},
      create: {
        id: 'acc-lyd-cash-main',
        name: 'Main Cash Register (LYD)',
        type: 'CASH_REGISTER',
        currency: 'LYD',
        active: true,
      },
    }),
    prisma.financialAccount.upsert({
      where: { id: 'acc-lyd-bank-main' },
      update: {},
      create: {
        id: 'acc-lyd-bank-main',
        name: 'Main Bank Account (LYD)',
        type: 'BANK_ACCOUNT',
        currency: 'LYD',
        active: true,
      },
    }),
    prisma.financialAccount.upsert({
      where: { id: 'acc-usd-bank-main' },
      update: {},
      create: {
        id: 'acc-usd-bank-main',
        name: 'Main Bank Account (USD)',
        type: 'BANK_ACCOUNT',
        currency: 'USD',
        active: true,
      },
    }),
    prisma.financialAccount.upsert({
      where: { id: 'acc-usd-card-processor' },
      update: {},
      create: {
        id: 'acc-usd-card-processor',
        name: 'International Card Processor (USD)',
        type: 'DIGITAL_WALLET',
        currency: 'USD',
        active: true,
      },
    }),
  ]);

  const [lydCash, lydBank, usdBank, usdCardProcessor] = accounts;

  console.log('✅ Financial accounts created');

  // Create opening balances (illustrative only)
  await Promise.all([
    prisma.openingBalance.upsert({
      where: {
        effectiveDate_currency: {
          effectiveDate: new Date('2026-09-01'),
          currency: 'LYD',
        },
      },
      update: {},
      create: {
        effectiveDate: new Date('2026-09-01'),
        currency: 'LYD',
        amount: 480000,
        notes: 'ILLUSTRATIVE ONLY - Sample opening balance for demo purposes',
      },
    }),
    prisma.openingBalance.upsert({
      where: {
        effectiveDate_currency: {
          effectiveDate: new Date('2026-09-01'),
          currency: 'USD',
        },
      },
      update: {},
      create: {
        effectiveDate: new Date('2026-09-01'),
        currency: 'USD',
        amount: 45000,
        notes: 'ILLUSTRATIVE ONLY - Sample opening balance for demo purposes',
      },
    }),
  ]);

  console.log('✅ Opening balances created');

  // Create monthly budgets (illustrative only)
  await Promise.all([
    prisma.monthlyBudget.upsert({
      where: {
        month_currency_platformId: {
          month: new Date('2026-09-01'),
          currency: 'LYD',
          platformId: '',
        },
      },
      update: {},
      create: {
        month: new Date('2026-09-01'),
        currency: 'LYD',
        amount: 180000,
        platformId: null,
      },
    }),
    prisma.monthlyBudget.upsert({
      where: {
        month_currency_platformId: {
          month: new Date('2026-10-01'),
          currency: 'LYD',
          platformId: '',
        },
      },
      update: {},
      create: {
        month: new Date('2026-10-01'),
        currency: 'LYD',
        amount: 180000,
        platformId: null,
      },
    }),
    prisma.monthlyBudget.upsert({
      where: {
        month_currency_platformId: {
          month: new Date('2026-09-01'),
          currency: 'USD',
          platformId: '',
        },
      },
      update: {},
      create: {
        month: new Date('2026-09-01'),
        currency: 'USD',
        amount: 8500,
        platformId: null,
      },
    }),
    prisma.monthlyBudget.upsert({
      where: {
        month_currency_platformId: {
          month: new Date('2026-10-01'),
          currency: 'USD',
          platformId: '',
        },
      },
      update: {},
      create: {
        month: new Date('2026-10-01'),
        currency: 'USD',
        amount: 8500,
        platformId: null,
      },
    }),
  ]);

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
      descriptionAr: 'حجوزات شهر سبتمبر أي-ستاي',
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
      descriptionAr: 'اشتراكات سبتمبر أي-ماركت',
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
      descriptionAr: 'عضويات شهر سبتمبر أي-سبيس',
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
      descriptionAr: 'حجوزات شاليهات واستراحات أي-ستاي (سداد/تداول)',
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
      descriptionAr: 'اشتراكات تجار الجملة والموردين - أي-ماركت',
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
      descriptionAr: 'إيجارات مكاتب وقاعات اجتماعات أي-سبيس',
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
      descriptionAr: 'حملات إعلانية ممولة (إطلاق أي-ستاي)',
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