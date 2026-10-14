import type { Prisma } from '@prisma/client';
import { badRequest, guard, json, parseCurrency, parseRanges } from '@/lib/server/guard';

export const dynamic = 'force-dynamic';

const STATUSES = ['PAID', 'PENDING', 'UPCOMING'] as const;
const METHODS = ['CASH', 'LOCAL_CARD', 'INTERNATIONAL_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'OTHER', 'NOT_APPLICABLE'] as const;

export const GET = guard('transactions:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;

  const where: Prisma.FinancialTransactionWhereInput = { organizationId: access.organizationId };

  if (sp.get('from') || sp.get('to')) {
    const ranges = parseRanges(sp);
    if (!ranges) return badRequest('Invalid period. Use from/to as YYYY-MM-DD');
    where.transactionDate = { gte: new Date(`${ranges.range.from}T00:00:00Z`), lte: new Date(`${ranges.range.to}T00:00:00Z`) };
  }

  const currencyParam = sp.get('currency');
  if (currencyParam) {
    const currency = parseCurrency(currencyParam);
    if (!currency) return badRequest('Invalid currency. Must be LYD or USD');
    where.currency = currency;
  }

  const status = sp.get('status');
  if (status) {
    if (!(STATUSES as readonly string[]).includes(status)) return badRequest('Invalid status');
    where.status = status as (typeof STATUSES)[number];
  }
  const method = sp.get('paymentMethod');
  if (method) {
    if (!(METHODS as readonly string[]).includes(method)) return badRequest('Invalid payment method');
    where.paymentMethod = method as (typeof METHODS)[number];
  }
  const category = sp.get('category');
  if (category) where.category = category;

  const rawPage = parseInt(sp.get('page') || '1', 10);
  const rawLimit = parseInt(sp.get('limit') || '50', 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50;

  const [rows, total] = await Promise.all([
    prisma.financialTransaction.findMany({
      where,
      select: {
        id: true,
        description: true,
        descriptionAr: true,
        amount: true,
        currency: true,
        type: true,
        status: true,
        category: true,
        categoryAr: true,
        transactionDate: true,
        paymentMethod: true,
        paymentProvider: true,
        externalReference: true,
        accountId: true,
        platform: { select: { id: true, name: true, code: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
      orderBy: [{ transactionDate: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.financialTransaction.count({ where }),
  ]);

  return json({
    data: rows.map((r) => ({ ...r, amount: Number(r.amount.toString()) })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
