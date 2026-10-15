import type { Prisma } from '@prisma/client';
import { badRequest, guard, json, parseCurrency, parseRanges } from '@/lib/server/guard';
import { readJson } from '@/lib/server/validate';
import { parsePaging } from '@/lib/server/paging';
import { CSV_MAX_ROWS, canExport, csvResponse } from '@/lib/server/csvResponse';
import { checkRefs, readTransaction } from '@/lib/server/transactions';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

const STATUSES = ['PAID', 'PENDING', 'UPCOMING'] as const;
const METHODS = ['CASH', 'LOCAL_CARD', 'INTERNATIONAL_CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET', 'OTHER', 'NOT_APPLICABLE'] as const;

const SORTS = ['date', 'amount', 'description', 'status', 'category'] as const;

/** Searchable, filterable, sortable, paginated transactions (tenant-scoped); `format=csv` exports the same filter. */
export const GET = guard('transactions:view', async (req, access, prisma) => {
  const sp = new URL(req.url).searchParams;
  const org = access.organizationId;
  const where: Prisma.FinancialTransactionWhereInput = { organizationId: org };

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
  const statusParam = sp.get('status');
  if (statusParam) {
    const list = statusParam.toUpperCase().split(',').filter(Boolean);
    if (list.length === 0 || !list.every((x) => (STATUSES as readonly string[]).includes(x))) return badRequest('Invalid status');
    where.status = { in: list as (typeof STATUSES)[number][] };
  }
  const method = sp.get('paymentMethod');
  if (method) {
    if (!(METHODS as readonly string[]).includes(method)) return badRequest('Invalid payment method');
    where.paymentMethod = method as (typeof METHODS)[number];
  }
  const type = (sp.get('type') ?? '').toUpperCase();
  if (type === 'INCOME' || type === 'EXPENSE') where.type = type;
  const category = sp.get('category');
  if (category) where.category = category;
  const platform = sp.get('platform');
  if (platform) where.platform = { is: { code: platform } };
  const paging = parsePaging(sp, SORTS, 'date', 'desc');
  if (paging.q) {
    const c = { contains: paging.q, mode: 'insensitive' as const };
    where.OR = [{ description: c }, { descriptionAr: c }, { category: c }, { reference: c }, { id: c }];
  }
  const dir = paging.dir;
  const orderBy: Prisma.FinancialTransactionOrderByWithRelationInput[] =
    paging.sort === 'amount' ? [{ amount: dir }, { id: 'asc' }]
    : paging.sort === 'description' ? [{ description: dir }, { id: 'asc' }]
    : paging.sort === 'status' ? [{ status: dir }, { id: 'asc' }]
    : paging.sort === 'category' ? [{ category: dir }, { id: 'asc' }]
    : [{ transactionDate: dir }, { id: 'asc' }];

  const rawLimit = parseInt(sp.get('limit') || '', 10);
  const csv = sp.get('format') === 'csv';
  if (csv && !canExport(access)) return json({ error: 'Forbidden' }, 403);
  const pageSize = csv ? CSV_MAX_ROWS : Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : paging.pageSize;
  const page = csv ? 1 : paging.page;

  const [rows, total, categories, platforms] = await Promise.all([
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
        dueDate: true,
        reference: true,
        paymentMethod: true,
        paymentProvider: true,
        externalReference: true,
        accountId: true,
        platformId: true,
        platform: { select: { id: true, name: true, code: true } },
        account: { select: { id: true, name: true, type: true, currency: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.financialTransaction.count({ where }),
    csv ? Promise.resolve([]) : prisma.financialTransaction.groupBy({ by: ['category'], where: { organizationId: org }, orderBy: { category: 'asc' } }),
    csv ? Promise.resolve([]) : prisma.platform.findMany({ where: { organizationId: org }, select: { id: true, name: true, code: true }, orderBy: { name: 'asc' } }),
  ]);

  const data = rows.map((r) => ({ ...r, amount: Number(r.amount.toString()) }));
  if (csv) {
    return csvResponse(
      'a-group-transactions.csv',
      ['Reference', 'Date', 'Description', 'Platform', 'Category', 'Type', 'Status', 'PaymentMethod', 'Currency', 'Amount'],
      data.map((r) => [r.reference ?? r.id, r.transactionDate.toISOString().slice(0, 10), r.description, r.platform?.name ?? '', r.category, r.type === 'INCOME' ? 'income' : 'expense', r.status.toLowerCase(), r.paymentMethod, r.currency, r.amount])
    );
  }
  return json({
    data,
    total,
    page,
    pageSize,
    pagination: { page, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    facets: { categories: categories.map((c) => c.category), platforms },
  });
});

export const POST = guard('transactions:write', async (req, access, prisma) => {
  const { r, data } = readTransaction(await readJson(req), false);
  if (!r.ok) return json({ error: 'Validation failed', fields: r.errors }, 422);
  const refErrors = await checkRefs(prisma, access.organizationId, data, data.currency as string);
  if (Object.keys(refErrors).length) return json({ error: 'Validation failed', fields: refErrors }, 422);

  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.financialTransaction.create({
      data: {
        ...(data as object),
        organizationId: access.organizationId,
        transactionDate: new Date(`${data.transactionDate}T00:00:00Z`),
        dueDate: data.dueDate ? new Date(`${data.dueDate}T00:00:00Z`) : null,
      } as never,
    });
    await auditOp(tx, access, 'transaction.create', 'FinancialTransaction', row.id, `Added ${data.type === 'INCOME' ? 'income' : 'expense'} "${data.description}" (${data.amount} ${data.currency})`);
    return row;
  });
  return json({ id: created.id }, 201);
});
