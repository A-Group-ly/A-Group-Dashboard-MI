import { guard, json } from '@/lib/server/guard';
import { Reader, readJson } from '@/lib/server/validate';
import { auditOp } from '@/lib/server/audit';

export const dynamic = 'force-dynamic';

const iso = (d: Date) => d.toISOString().slice(0, 7);

/** Company-wide monthly budgets (one per month and currency). */
export const GET = guard('budgets:view', async (_req, access, prisma) => {
  const rows = await prisma.monthlyBudget.findMany({
    where: { organizationId: access.organizationId, platformId: null },
    orderBy: [{ month: 'desc' }, { currency: 'asc' }],
    take: 48,
  });
  return json({ data: rows.map((b) => ({ id: b.id, month: iso(b.month), currency: b.currency, amount: Number(b.amount.toString()) })) });
});

/** Create or replace the company-wide budget of one month in one currency. */
export const PUT = guard('budgets:write', async (req, access, prisma) => {
  const r = new Reader(await readJson(req));
  const month = r.str('month', { max: 7, required: true });
  const currency = r.oneOf('currency', ['LYD', 'USD'] as const);
  const amount = r.money('amount');
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) r.errors.month = 'invalid_date';
  if (!r.ok || !month || !currency || amount === undefined) return json({ error: 'Validation failed', fields: r.errors }, 422);

  const first = new Date(`${month}-01T00:00:00Z`);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.monthlyBudget.findFirst({ where: { organizationId: access.organizationId, month: first, currency, platformId: null } });
    const row = existing
      ? await tx.monthlyBudget.update({ where: { id: existing.id }, data: { amount } })
      : await tx.monthlyBudget.create({ data: { organizationId: access.organizationId, month: first, currency, amount, platformId: null } });
    await auditOp(tx, access, existing ? 'budget.update' : 'budget.create', 'MonthlyBudget', row.id, `Set ${month} ${currency} budget to ${amount}`);
    return row;
  });
  return json({ id: result.id, month, currency, amount });
});
